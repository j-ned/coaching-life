import type { CreateAppointmentInput } from './appointment-schema.js';
import { getUnavailableDayReason } from './french-holidays.js';
import { toParisDateTime } from './paris-time.js';

type BookingRuleViolation = 'invalid_date' | 'past_date' | 'unavailable_day' | 'disabled_date';

type BookingRuleResult =
  | { readonly ok: true; readonly duration: number }
  | { readonly ok: false; readonly code: BookingRuleViolation; readonly message: string };

export const BOOKING_RULE_MESSAGES: Readonly<Record<BookingRuleViolation, string>> = {
  invalid_date: 'Date invalide.',
  past_date: 'Cette date est passée.',
  unavailable_day: "Ce jour n'est pas ouvert à la réservation.",
  disabled_date: "Ce jour n'est pas disponible à la réservation.",
};

function violation(code: BookingRuleViolation): BookingRuleResult {
  return { ok: false, code, message: BOOKING_RULE_MESSAGES[code] };
}

function isCalendarDate(isoDate: string): boolean {
  const [year, month, day] = isoDate.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === isoDate;
}

export function checkBookingRules(
  request: Pick<CreateAppointmentInput, 'appointment_date' | 'duration'>,
  now: Date,
): BookingRuleResult {
  const { appointment_date: date, duration } = request;
  if (!isCalendarDate(date)) return violation('invalid_date');
  // Comparaison lexicale valide : les deux dates sont au format ISO YYYY-MM-DD.
  if (date < toParisDateTime(now).date) return violation('past_date');
  if (getUnavailableDayReason(date) !== null) return violation('unavailable_day');
  return { ok: true, duration };
}
