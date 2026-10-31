import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppointmentRoutes } from './appointments.js';
import {
  InMemoryBookingRepository,
  SpyBookingNotifier,
  aBookingRequest,
  fixedClock,
  postBooking,
  type BookingRequest,
} from '../test/booking-fakes.js';

class FailingBookingNotifier extends SpyBookingNotifier {
  override appointmentBooked = async (data: BookingRequest): Promise<void> => {
    this.booked.push(data);
    throw new Error('SMTP indisponible');
  };
}

class BrokenBookingRepository extends InMemoryBookingRepository {
  override insert = async (): Promise<void> => {
    throw new Error('Connexion à la base perdue');
  };
}

function setup(
  notifier: SpyBookingNotifier = new SpyBookingNotifier(),
  bookings: InMemoryBookingRepository = new InMemoryBookingRepository(),
) {
  const app = createAppointmentRoutes({ bookings, notifier, now: fixedClock() });
  return { app, bookings, notifier };
}

describe('POST /api/appointments', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepte une réservation valide : 201, enregistrement et notification', async () => {
    const { app, bookings, notifier } = setup();
    const request = aBookingRequest();

    const response = await postBooking(app, request);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      success: true,
      message: 'Votre rendez-vous a été réservé avec succès !',
    });
    expect(bookings.inserted).toEqual([request]);
    expect(notifier.booked).toEqual([request]);
  });

  it("répond 201 même quand l'envoi des emails échoue", async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { app, bookings, notifier } = setup(new FailingBookingNotifier());
    const request = aBookingRequest();

    const response = await postBooking(app, request);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(response.status).toBe(201);
    expect(bookings.inserted).toEqual([request]);
    expect(notifier.booked).toEqual([request]);
  });

  it('refuse une requête mal formée en 400 sans rien enregistrer ni notifier', async () => {
    const { app, bookings, notifier } = setup();

    const response = await postBooking(app, aBookingRequest({ client_email: 'pas-un-email' }));

    expect(response.status).toBe(400);
    expect(bookings.inserted).toEqual([]);
    expect(notifier.booked).toEqual([]);
  });

  it('limite les soumissions à 5 par minute et par IP', async () => {
    const { app, bookings } = setup();
    const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

    const statuses: number[] = [];
    for (const appointment_time of times) {
      const response = await postBooking(app, aBookingRequest({ appointment_time }));
      statuses.push(response.status);
    }

    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
    expect(bookings.inserted).toHaveLength(5);
  });

  it.each([
    { appointment_date: '2026-02-30', code: 'invalid_date', error: 'Date invalide.' },
    { appointment_date: '2026-09-30', code: 'past_date', error: 'Cette date est passée.' },
    {
      appointment_date: '2026-12-25',
      code: 'unavailable_day',
      error: "Ce jour n'est pas ouvert à la réservation.",
    },
    {
      appointment_date: '2026-10-03',
      code: 'unavailable_day',
      error: "Ce jour n'est pas ouvert à la réservation.",
    },
  ])(
    'refuse $appointment_date en 422 ($code) sans rien enregistrer ni notifier',
    async ({ appointment_date, code, error }) => {
      const { app, bookings, notifier } = setup();

      const response = await postBooking(app, aBookingRequest({ appointment_date }));

      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error, code });
      expect(bookings.inserted).toEqual([]);
      expect(notifier.booked).toEqual([]);
    },
  );

  it.each([
    {
      cas: 'une durée non proposée',
      overrides: { duration: 45 },
      code: 'invalid_duration',
      error: "Cette durée de rendez-vous n'est pas proposée.",
    },
    {
      cas: 'un horaire hors pas',
      overrides: { appointment_time: '09:15' },
      code: 'invalid_slot',
      error: "Cet horaire n'est pas proposé.",
    },
    {
      cas: 'un créneau qui finit après 18h',
      overrides: { appointment_time: '17:30' },
      code: 'invalid_slot',
      error: "Cet horaire n'est pas proposé.",
    },
    {
      cas: 'un créneau à moins de 24 h',
      overrides: { appointment_date: '2026-10-02', appointment_time: '09:30' },
      code: 'too_soon',
      error: "Les rendez-vous doivent être pris au moins 24 h à l'avance.",
    },
  ])(
    'refuse $cas en 422 ($code) sans rien enregistrer ni notifier',
    async ({ overrides, code, error }) => {
      const { app, bookings, notifier } = setup();

      const response = await postBooking(app, aBookingRequest(overrides));

      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error, code });
      expect(bookings.inserted).toEqual([]);
      expect(notifier.booked).toEqual([]);
    },
  );

  it('accepte un créneau qui commence exactement 24 h après la demande', async () => {
    const { app, bookings, notifier } = setup();
    const request = aBookingRequest({ appointment_date: '2026-10-02', appointment_time: '10:00' });

    const response = await postBooking(app, request);

    expect(response.status).toBe(201);
    expect(bookings.inserted).toEqual([request]);
    expect(notifier.booked).toEqual([request]);
  });

  it("refuse en 422 le seul jour désactivé par l'admin, sans l'enregistrer ni le notifier", async () => {
    const { app, bookings, notifier } = setup();
    bookings.disableDate('2026-10-05');
    const otherDay = aBookingRequest({ appointment_date: '2026-10-06' });

    const refused = await postBooking(app, aBookingRequest({ appointment_date: '2026-10-05' }));
    const accepted = await postBooking(app, otherDay);

    expect(refused.status).toBe(422);
    expect(await refused.json()).toEqual({
      error: "Ce jour n'est pas disponible à la réservation.",
      code: 'disabled_date',
    });
    expect(accepted.status).toBe(201);
    expect(bookings.inserted).toEqual([otherDay]);
    expect(notifier.booked).toEqual([otherDay]);
  });

  it('signale la règle de calendrier plutôt que la désactivation quand les deux s’appliquent', async () => {
    const { app, bookings } = setup();
    bookings.disableDate('2026-10-03');

    const response = await postBooking(app, aBookingRequest({ appointment_date: '2026-10-03' }));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "Ce jour n'est pas ouvert à la réservation.",
      code: 'unavailable_day',
    });
  });

  it.each([
    { cas: 'le même créneau', overrides: {} },
    { cas: 'un créneau qui chevauche', overrides: { appointment_time: '10:30', duration: 30 } },
  ])(
    'refuse $cas déjà réservé en 409 sans enregistrer ni notifier la seconde demande',
    async ({ overrides }) => {
      const { app, bookings, notifier } = setup();
      const first = aBookingRequest();

      await postBooking(app, first);
      const response = await postBooking(app, aBookingRequest(overrides));

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: "Ce créneau vient d'être réservé, choisissez-en un autre.",
        code: 'slot_taken',
      });
      expect(bookings.inserted).toEqual([first]);
      expect(notifier.booked).toEqual([first]);
    },
  );

  it("ne traduit pas en 409 une panne d'enregistrement, et ne notifie pas", async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { app, notifier } = setup(new SpyBookingNotifier(), new BrokenBookingRepository());

    const response = await postBooking(app, aBookingRequest());

    expect(response.status).toBe(500);
    expect(notifier.booked).toEqual([]);
  });
});
