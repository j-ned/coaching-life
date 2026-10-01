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

function setup(notifier: SpyBookingNotifier = new SpyBookingNotifier()) {
  const bookings = new InMemoryBookingRepository();
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
});
