import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from './index.js';
import { appointments } from './schema.js';
import {
  SlotTakenError,
  createBookingRepository,
  isExclusionViolation,
} from './booking-repository.js';
import { aBookingRequest } from '../test/booking-fakes.js';
import { listBookedSlots, resetBookingTables, seedAppointment } from '../test/booking-db.js';

const bookings = createBookingRepository(db);

describe('createBookingRepository sur PostgreSQL', () => {
  beforeEach(async () => {
    await resetBookingTables(db);
  });

  afterAll(async () => {
    await db.$client.end();
  });

  it.each([
    { cas: 'le même créneau', time: '10:00', duration: 60 },
    { cas: 'un créneau inclus', time: '10:30', duration: 30 },
    { cas: 'un créneau qui déborde après', time: '10:30', duration: 60 },
    { cas: 'un créneau qui déborde avant', time: '09:30', duration: 60 },
  ])(
    "refuse $cas d'un rendez-vous 10:00-11:00 par SlotTakenError, sans l'enregistrer",
    async ({ time, duration }) => {
      await bookings.insert(aBookingRequest({ appointment_time: '10:00', duration: 60 }));

      await expect(
        bookings.insert(aBookingRequest({ appointment_time: time, duration })),
      ).rejects.toBeInstanceOf(SlotTakenError);

      expect(await listBookedSlots(db)).toEqual([
        {
          appointment_date: '2026-10-05',
          appointment_time: '10:00',
          duration: 60,
          status: 'pending',
        },
      ]);
    },
  );

  it.each(['pending', 'confirmed', 'completed'] as const)(
    'considère le créneau pris par un rendez-vous %s',
    async (status) => {
      await seedAppointment(db, aBookingRequest(), status);

      await expect(bookings.insert(aBookingRequest())).rejects.toBeInstanceOf(SlotTakenError);
    },
  );

  it('libère le créneau d’un rendez-vous annulé', async () => {
    await seedAppointment(db, aBookingRequest(), 'cancelled');

    await bookings.insert(aBookingRequest());

    expect(await listBookedSlots(db)).toEqual([
      {
        appointment_date: '2026-10-05',
        appointment_time: '10:00',
        duration: 60,
        status: 'cancelled',
      },
      {
        appointment_date: '2026-10-05',
        appointment_time: '10:00',
        duration: 60,
        status: 'pending',
      },
    ]);
  });

  it('accepte les créneaux adjacents et le même horaire un autre jour', async () => {
    await bookings.insert(aBookingRequest({ appointment_time: '10:00', duration: 60 }));

    await bookings.insert(aBookingRequest({ appointment_time: '11:00', duration: 30 }));
    await bookings.insert(aBookingRequest({ appointment_time: '09:30', duration: 30 }));
    await bookings.insert(aBookingRequest({ appointment_date: '2026-10-06' }));

    expect(await listBookedSlots(db)).toEqual([
      {
        appointment_date: '2026-10-05',
        appointment_time: '09:30',
        duration: 30,
        status: 'pending',
      },
      {
        appointment_date: '2026-10-05',
        appointment_time: '10:00',
        duration: 60,
        status: 'pending',
      },
      {
        appointment_date: '2026-10-05',
        appointment_time: '11:00',
        duration: 30,
        status: 'pending',
      },
      {
        appointment_date: '2026-10-06',
        appointment_time: '10:00',
        duration: 60,
        status: 'pending',
      },
    ]);
  });

  it('refuse un chevauchement écrit hors du repository, au niveau de la base', async () => {
    await seedAppointment(db, aBookingRequest({ appointment_time: '10:00', duration: 60 }));

    const failure = await db
      .insert(appointments)
      .values({
        ...aBookingRequest({ appointment_time: '10:30', duration: 30 }),
        status: 'confirmed',
      })
      .then(
        () => null,
        (err: unknown) => err,
      );

    expect(isExclusionViolation(failure)).toBe(true);
  });

  it("n'enregistre qu'une réservation sur 10 insertions simultanées du même créneau", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => bookings.insert(aBookingRequest())),
    );

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejections = results.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : [],
    );
    expect(rejections).toHaveLength(9);
    expect(rejections.every((reason) => reason instanceof SlotTakenError)).toBe(true);
    expect(await listBookedSlots(db)).toHaveLength(1);
  });
});
