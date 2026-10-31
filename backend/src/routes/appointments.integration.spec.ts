import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/index.js';
import { createBookingRepository } from '../db/booking-repository.js';
import { signSession } from '../lib/session.js';
import { createAppointmentRoutes } from './appointments.js';
import {
  SpyBookingNotifier,
  aBookingRequest,
  fixedClock,
  postBooking,
} from '../test/booking-fakes.js';
import {
  listBookedSlots,
  resetBookingTables,
  seedAppointment,
  statusOf,
} from '../test/booking-db.js';

function setup() {
  const notifier = new SpyBookingNotifier();
  const app = createAppointmentRoutes({
    bookings: createBookingRepository(db),
    notifier,
    now: fixedClock(),
  });
  return { app, notifier };
}

async function patchStatus(
  app: ReturnType<typeof createAppointmentRoutes>,
  id: string,
  status: string,
): Promise<Response> {
  const token = await signSession({
    sub: 'admin-id',
    email: 'admin@example.com',
    name: 'Admin',
    role: 'admin',
  });
  return app.request(`/${id}/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie: `session=${token}` },
    body: JSON.stringify({ status }),
  });
}

describe('routes de rendez-vous sur PostgreSQL', () => {
  beforeEach(async () => {
    await resetBookingTables(db);
  });

  afterAll(async () => {
    await db.$client.end();
  });

  it("n'accepte qu'une de deux réservations simultanées du même créneau et ne notifie qu'elle", async () => {
    const { app, notifier } = setup();
    const first = aBookingRequest({ client_email: 'premiere@example.com' });
    const second = aBookingRequest({ client_email: 'seconde@example.com' });

    const responses = await Promise.all([postBooking(app, first), postBooking(app, second)]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const refused = responses.find((response) => response.status === 409);
    expect(await refused?.json()).toEqual({
      error: "Ce créneau vient d'être réservé, choisissez-en un autre.",
      code: 'slot_taken',
    });
    expect(notifier.booked).toHaveLength(1);
    expect(await listBookedSlots(db)).toEqual([
      {
        appointment_date: '2026-10-05',
        appointment_time: '10:00',
        duration: 60,
        status: 'pending',
      },
    ]);
  });

  it('refuse en 409 de réactiver un rendez-vous annulé dont le créneau a été repris', async () => {
    const { app } = setup();
    const cancelledId = await seedAppointment(db, aBookingRequest(), 'cancelled');
    await seedAppointment(db, aBookingRequest({ appointment_time: '10:30', duration: 30 }));

    const response = await patchStatus(app, cancelledId, 'confirmed');

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'slot_taken' });
    expect(await statusOf(db, cancelledId)).toBe('cancelled');
  });

  it('réactive un rendez-vous annulé dont le créneau est resté libre', async () => {
    const { app } = setup();
    const cancelledId = await seedAppointment(db, aBookingRequest(), 'cancelled');
    await seedAppointment(db, aBookingRequest({ appointment_time: '11:00', duration: 30 }));

    const response = await patchStatus(app, cancelledId, 'confirmed');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: cancelledId, status: 'confirmed' });
    expect(await statusOf(db, cancelledId)).toBe('confirmed');
  });
});
