import { eq } from 'drizzle-orm';
import type { db as appDb } from './index.js';
import { appointments, disabled_dates } from './schema.js';
import type { CreateAppointmentInput } from '../lib/appointment-schema.js';

const EXCLUSION_VIOLATION = '23P01';

export type BookingRepository = {
  readonly isDateDisabled: (date: string) => Promise<boolean>;
  readonly insert: (data: CreateAppointmentInput) => Promise<void>;
};

export class SlotTakenError extends Error {
  constructor() {
    super('Le créneau chevauche un rendez-vous existant.');
    this.name = 'SlotTakenError';
  }
}

function hasSqlState(value: unknown, code: string): boolean {
  return typeof value === 'object' && value !== null && 'code' in value && value.code === code;
}

// Drizzle 0.45 enveloppe l'erreur du driver dans DrizzleQueryError : le SQLSTATE est sur cause.
export function isExclusionViolation(err: unknown): boolean {
  if (hasSqlState(err, EXCLUSION_VIOLATION)) return true;
  return err instanceof Error && hasSqlState(err.cause, EXCLUSION_VIOLATION);
}

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
      try {
        await db.insert(appointments).values(data);
      } catch (err) {
        if (isExclusionViolation(err)) throw new SlotTakenError();
        throw err;
      }
    },
  };
}
