import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, ne, asc, and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { db, appointments, disabled_dates } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { sendAppointmentConfirmation, notifyAdminNewAppointment } from '../lib/mailer.js';

// Soumission publique → limite stricte par IP (anti-spam).
const submitRateLimit = rateLimit({ windowMs: 60_000, max: 5 });

// Schemas

const coachingTypeSchema = z.enum([
  'life-coaching',
  'personal-development',
  'equine-coaching',
  'neuroatypical-parents',
]);

const appointmentStatusSchema = z.enum(['pending', 'confirmed', 'cancelled', 'completed']);

const createAppointmentSchema = z.object({
  client_name: z.string().min(2).max(100),
  client_email: z.string().email(),
  client_phone: z.string().min(8).max(20),
  coaching_type: coachingTypeSchema,
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appointment_time: z.string().regex(/^\d{2}:\d{2}$/),
  duration: z.number().int().positive(),
  message: z.string().max(2000).optional().default(''),
});

const updateStatusSchema = z.object({
  status: appointmentStatusSchema,
});

const addDisabledDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(200).optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

// Routes

export const appointmentRoutes = new Hono()

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
  .post('/disabled-dates', requireAdmin, zValidator('json', addDisabledDateSchema), async (c) => {
    const data = c.req.valid('json');
    const [row] = await db
      .insert(disabled_dates)
      .values({ date: data.date, reason: data.reason ?? null })
      .returning();
    return c.json(row, 201);
  })

  // DELETE /api/appointments/disabled-dates/:id  (admin)
  .delete('/disabled-dates/:id', requireAdmin, zValidator('param', idParamSchema), async (c) => {
    const { id } = c.req.valid('param');
    await db.delete(disabled_dates).where(eq(disabled_dates.id, id));
    return c.json({ ok: true });
  })

  // POST /api/appointments  (public)
  .post('/', submitRateLimit, zValidator('json', createAppointmentSchema), async (c) => {
    const data = c.req.valid('json');
    await db.insert(appointments).values(data);

    // Emails en fire & forget (n'empêche pas la réponse si ça échoue)
    Promise.all([
      sendAppointmentConfirmation({
        clientName: data.client_name,
        clientEmail: data.client_email,
        coachingType: data.coaching_type,
        date: data.appointment_date,
        time: data.appointment_time,
        duration: data.duration,
      }),
      notifyAdminNewAppointment({
        clientName: data.client_name,
        clientEmail: data.client_email,
        coachingType: data.coaching_type,
        date: data.appointment_date,
        time: data.appointment_time,
      }),
    ]).catch((err) => console.error('[mail] appointment:', err));

    return c.json({ success: true, message: 'Votre rendez-vous a été réservé avec succès !' }, 201);
  })

  // GET /api/appointments  (admin)
  .get('/', requireAdmin, async (c) => {
    const rows = await db.select().from(appointments).orderBy(asc(appointments.appointment_date));
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
      const [row] = await db
        .update(appointments)
        .set({ status })
        .where(eq(appointments.id, id))
        .returning();
      if (!row) return c.json({ error: 'Not found' }, 404);
      return c.json(row);
    },
  )

  // DELETE /api/appointments/:id  (admin)
  .delete('/:id', requireAdmin, zValidator('param', idParamSchema), async (c) => {
    const { id } = c.req.valid('param');
    await db.delete(appointments).where(eq(appointments.id, id));
    return c.json({ ok: true });
  });
