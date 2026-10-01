import type { db as appDb } from './index.js';
import { appointments } from './schema.js';
import type { CreateAppointmentInput } from '../lib/appointment-schema.js';

export type BookingRepository = {
  readonly insert: (data: CreateAppointmentInput) => Promise<void>;
};

export function createBookingRepository(db: typeof appDb): BookingRepository {
  return {
    insert: async (data) => {
      await db.insert(appointments).values(data);
    },
  };
}
