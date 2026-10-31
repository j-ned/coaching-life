import type { CreateAppointmentInput } from './appointment-schema.js';
import { getUnavailableDayReason } from './french-holidays.js';
import { type ParisDateTime, toParisDateTime } from './paris-time.js';

export const BOOKING_OPENING_HOUR = 9;
export const BOOKING_CLOSING_HOUR = 18;
export const BOOKING_SLOT_STEP_MINUTES = 30;
export const BOOKING_DURATIONS = [30, 60] as const;
export const BOOKING_LEAD_TIME_MS = 24 * 60 * 60 * 1000;

type BookingDuration = (typeof BOOKING_DURATIONS)[number];

type BookingRuleViolation =
  | 'invalid_date'
  | 'past_date'
  | 'unavailable_day'
  | 'invalid_duration'
  | 'invalid_slot'
  | 'too_soon'
  | 'disabled_date';

type BookingRuleResult =
  | { readonly ok: true; readonly duration: BookingDuration }
  | { readonly ok: false; readonly code: BookingRuleViolation; readonly message: string };

export const BOOKING_RULE_MESSAGES: Readonly<Record<BookingRuleViolation, string>> = {
  invalid_date: 'Date invalide.',
  past_date: 'Cette date est passée.',
  unavailable_day: "Ce jour n'est pas ouvert à la réservation.",
  invalid_duration: "Cette durée de rendez-vous n'est pas proposée.",
  invalid_slot: "Cet horaire n'est pas proposé.",
  too_soon: "Les rendez-vous doivent être pris au moins 24 h à l'avance.",
  disabled_date: "Ce jour n'est pas disponible à la réservation.",
};

function violation(code: BookingRuleViolation): BookingRuleResult {
  return { ok: false, code, message: BOOKING_RULE_MESSAGES[code] };
}

function isCalendarDate(isoDate: string): boolean {
  const [year, month, day] = isoDate.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === isoDate;
}

function isBookingDuration(duration: number): duration is BookingDuration {
  return (BOOKING_DURATIONS as readonly number[]).includes(duration);
}

function formatTime(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`;
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number) as [number, number];
  return hours * 60 + minutes;
}

export function listSlotStarts(duration: BookingDuration): readonly string[] {
  const starts: string[] = [];
  for (
    let start = BOOKING_OPENING_HOUR * 60;
    start + duration <= BOOKING_CLOSING_HOUR * 60;
    start += BOOKING_SLOT_STEP_MINUTES
  ) {
    starts.push(formatTime(start));
  }
  return starts;
}

// +24 h sur l'instant absolu AVANT conversion : ajouter 24 h à l'heure murale fausserait les jours de changement d'heure.
export function bookingThreshold(now: Date): ParisDateTime {
  return toParisDateTime(new Date(now.getTime() + BOOKING_LEAD_TIME_MS));
}

export function isSlotTooSoon(date: string, time: string, threshold: ParisDateTime): boolean {
  if (date !== threshold.date) return date < threshold.date;
  return toMinutes(time) < threshold.minutes;
}

export function checkBookingRules(
  request: Pick<CreateAppointmentInput, 'appointment_date' | 'appointment_time' | 'duration'>,
  now: Date,
): BookingRuleResult {
  const { appointment_date: date, appointment_time: time, duration } = request;
  if (!isCalendarDate(date)) return violation('invalid_date');
  // Comparaison lexicale valide : les deux dates sont au format ISO YYYY-MM-DD.
  if (date < toParisDateTime(now).date) return violation('past_date');
  if (getUnavailableDayReason(date) !== null) return violation('unavailable_day');
  if (!isBookingDuration(duration)) return violation('invalid_duration');
  if (!listSlotStarts(duration).includes(time)) return violation('invalid_slot');
  if (isSlotTooSoon(date, time, bookingThreshold(now))) return violation('too_soon');
  return { ok: true, duration };
}
