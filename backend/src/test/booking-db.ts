import { eq, sql } from 'drizzle-orm';
import type { db as appDb } from '../db/index.js';
import { appointments } from '../db/schema.js';
import type { BookingRequest } from './booking-fakes.js';

type Db = typeof appDb;
type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

// rate_limit_hits aussi : le quota de POST /api/appointments est désormais compté en base et
// survivrait d'un test à l'autre.
export async function resetBookingTables(db: Db): Promise<void> {
  await db.execute(sql`TRUNCATE appointments, disabled_dates, rate_limit_hits`);
}

export async function seedAppointment(
  db: Db,
  request: BookingRequest,
  status: AppointmentStatus = 'pending',
): Promise<string> {
  const [row] = await db
    .insert(appointments)
    .values({ ...request, status })
    .returning({ id: appointments.id });
  if (!row) throw new Error('Insertion de la ligne de test sans retour');
  return row.id;
}

export async function listBookedSlots(db: Db) {
  return db
    .select({
      appointment_date: appointments.appointment_date,
      appointment_time: appointments.appointment_time,
      duration: appointments.duration,
      status: appointments.status,
    })
    .from(appointments)
    .orderBy(appointments.appointment_date, appointments.appointment_time, appointments.created_at);
}

export async function statusOf(db: Db, id: string): Promise<string | undefined> {
  const [row] = await db
    .select({ status: appointments.status })
    .from(appointments)
    .where(eq(appointments.id, id));
  return row?.status;
}
