import type { Hono } from 'hono';
import type { BookingRepository } from '../db/booking-repository.js';
import type { BookingNotifier } from '../lib/booking-notifier.js';

export type BookingRequest = Parameters<BookingRepository['insert']>[0];

export const FIXED_NOW = new Date('2026-10-01T08:00:00.000Z');

export function fixedClock(instant: Date = FIXED_NOW): () => Date {
  return () => new Date(instant.getTime());
}

export function aBookingRequest(overrides: Partial<BookingRequest> = {}): BookingRequest {
  return {
    client_name: 'Marie Dupont',
    client_email: 'marie.dupont@example.com',
    client_phone: '0612345678',
    coaching_type: 'life-coaching',
    appointment_date: '2026-10-05',
    appointment_time: '10:00',
    duration: 60,
    message: 'Premier rendez-vous',
    ...overrides,
  };
}

export class InMemoryBookingRepository implements BookingRepository {
  readonly inserted: BookingRequest[] = [];
  private readonly disabledDates = new Set<string>();

  disableDate(date: string): void {
    this.disabledDates.add(date);
  }

  isDateDisabled = async (date: string): Promise<boolean> => this.disabledDates.has(date);

  insert = async (data: BookingRequest): Promise<void> => {
    this.inserted.push(data);
  };
}

export class SpyBookingNotifier implements BookingNotifier {
  readonly booked: BookingRequest[] = [];

  appointmentBooked = async (data: BookingRequest): Promise<void> => {
    this.booked.push(data);
  };
}

export function postBooking(app: Pick<Hono, 'request'>, body: unknown): Promise<Response> {
  return Promise.resolve(
    app.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}
