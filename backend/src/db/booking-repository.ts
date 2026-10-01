import { eq } from 'drizzle-orm';
import type { db as appDb } from './index.js';
import { appointments, disabled_dates } from './schema.js';
import type { CreateAppointmentInput } from '../lib/appointment-schema.js';

export type BookingRepository = {
  readonly isDateDisabled: (date: string) => Promise<boolean>;
  readonly insert: (data: CreateAppointmentInput) => Promise<void>;
};

export function createBookingRepository(db: typeof appDb): BookingRepository {
  return {
    isDateDisabled: async (date) => {
      const rows = await db
        .select({ id: disabled_dates.id })
        .from(disabled_dates)
        .where(eq(disabled_dates.date, date))
        .limit(1);
      return rows.length > 0;
    },
    insert: async (data) => {
      await db.insert(appointments).values(data);
    },
  };
}
