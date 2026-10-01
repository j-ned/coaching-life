import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, ne, asc, and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { db, appointments, disabled_dates } from '../db/index.js';
import {
  createBookingRepository,
  isExclusionViolation,
  SlotTakenError,
  type BookingRepository,
} from '../db/booking-repository.js';
import { requireAdmin } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { createAppointmentSchema } from '../lib/appointment-schema.js';
import { mailBookingNotifier, type BookingNotifier } from '../lib/booking-notifier.js';
import { BOOKING_RULE_MESSAGES, checkBookingRules } from '../lib/booking-rules.js';

type AppointmentRoutesDeps = {
  readonly bookings: BookingRepository;
  readonly notifier: BookingNotifier;
  readonly now: () => Date;
};

// Schemas

const appointmentStatusSchema = z.enum(['pending', 'confirmed', 'cancelled', 'completed']);

const updateStatusSchema = z.object({
  status: appointmentStatusSchema,
});

const addDisabledDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(200).optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

// Routes

export function createAppointmentRoutes({ bookings, notifier, now }: AppointmentRoutesDeps) {
  // Soumission publique → limite stricte par IP (anti-spam).
  const submitRateLimit = rateLimit({ windowMs: 60_000, max: 5 });

  return (
    new Hono()

      // GET /api/appointments/booked?month=YYYY-MM  (public)
      .get(
        '/booked',
        zValidator('query', z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) })),
        async (c) => {
          const { month } = c.req.valid('query');
          const [year, m] = month.split('-').map(Number) as [number, number];
          const start = `${year}-${String(m).padStart(2, '0')}-01`;
          const lastDay = new Date(year, m, 0).getDate();
          const end = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

          // Route PUBLIQUE : ne projeter que les créneaux occupés (date/heure/durée).
          // JAMAIS les PII clients (nom, email, téléphone, message) : fuite RGPD sinon.
          const rows = await db
            .select({
              appointment_date: appointments.appointment_date,
              appointment_time: appointments.appointment_time,
              duration: appointments.duration,
            })
            .from(appointments)
            .where(
              and(
                ne(appointments.status, 'cancelled'),
                gte(appointments.appointment_date, start),
                lte(appointments.appointment_date, end),
              ),
            );

          return c.json(rows);
        },
      )

      // GET /api/appointments/disabled-dates  (public)
      .get('/disabled-dates', async (c) => {
        const rows = await db.select().from(disabled_dates);
        return c.json(rows);
      })

      // POST /api/appointments/disabled-dates  (admin)
      .post(
        '/disabled-dates',
        requireAdmin,
        zValidator('json', addDisabledDateSchema),
        async (c) => {
          const data = c.req.valid('json');
          const [row] = await db
            .insert(disabled_dates)
            .values({ date: data.date, reason: data.reason ?? null })
            .returning();
          return c.json(row, 201);
        },
      )

      // DELETE /api/appointments/disabled-dates/:id  (admin)
      .delete(
        '/disabled-dates/:id',
        requireAdmin,
        zValidator('param', idParamSchema),
        async (c) => {
          const { id } = c.req.valid('param');
          await db.delete(disabled_dates).where(eq(disabled_dates.id, id));
          return c.json({ ok: true });
        },
      )

      // POST /api/appointments  (public)
      .post('/', submitRateLimit, zValidator('json', createAppointmentSchema), async (c) => {
        const data = c.req.valid('json');

        const rules = checkBookingRules(data, now());
        if (!rules.ok) return c.json({ error: rules.message, code: rules.code }, 422);

        if (await bookings.isDateDisabled(data.appointment_date)) {
          return c.json(
            { error: BOOKING_RULE_MESSAGES.disabled_date, code: 'disabled_date' },
            422,
          );
        }

        try {
          await bookings.insert(data);
        } catch (err) {
          if (!(err instanceof SlotTakenError)) throw err;
          return c.json(
            { error: "Ce créneau vient d'être réservé, choisissez-en un autre.", code: 'slot_taken' },
            409,
          );
        }

        // Emails en fire & forget (n'empêche pas la réponse si ça échoue)
        notifier.appointmentBooked(data).catch((err) => console.error('[mail] appointment:', err));

        return c.json(
          { success: true, message: 'Votre rendez-vous a été réservé avec succès !' },
          201,
        );
      })

      // GET /api/appointments  (admin)
      .get('/', requireAdmin, async (c) => {
        const rows = await db
          .select()
          .from(appointments)
          .orderBy(asc(appointments.appointment_date));
        return c.json(rows);
      })

      // PATCH /api/appointments/:id/status  (admin)
      .patch(
        '/:id/status',
        requireAdmin,
        zValidator('param', idParamSchema),
        zValidator('json', updateStatusSchema),
        async (c) => {
          const { id } = c.req.valid('param');
          const { status } = c.req.valid('json');
          try {
            const [row] = await db
              .update(appointments)
              .set({ status })
              .where(eq(appointments.id, id))
              .returning();
            if (!row) return c.json({ error: 'Not found' }, 404);
            return c.json(row);
          } catch (err) {
            // Réactiver un RDV annulé peut chevaucher un créneau repris depuis.
            if (!isExclusionViolation(err)) throw err;
            return c.json(
              { error: 'Ce créneau est déjà occupé par un autre rendez-vous.', code: 'slot_taken' },
              409,
            );
          }
        },
      )

      // DELETE /api/appointments/:id  (admin)
      .delete('/:id', requireAdmin, zValidator('param', idParamSchema), async (c) => {
        const { id } = c.req.valid('param');
        await db.delete(appointments).where(eq(appointments.id, id));
        return c.json({ ok: true });
      })
  );
}

export const appointmentRoutes = createAppointmentRoutes({
  bookings: createBookingRepository(db),
  notifier: mailBookingNotifier,
  now: () => new Date(),
});
