// Jumeau de backend/src/lib/booking-rules.ts, chargé tel quel par le test de parité backend : ce fichier ne doit rien importer.

export const BOOKING_OPENING_HOUR = 9;
export const BOOKING_CLOSING_HOUR = 18;
export const BOOKING_SLOT_STEP_MINUTES = 30;
export const BOOKING_DURATIONS = [30, 60] as const;
export const BOOKING_LEAD_TIME_MS = 24 * 60 * 60 * 1000;

export type BookingDuration = (typeof BOOKING_DURATIONS)[number];

type ParisDateTime = { readonly date: string; readonly minutes: number };

const parisFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function formatTime(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`;
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number) as [number, number];
  return hours * 60 + minutes;
}

export function toParisDateTime(instant: Date): ParisDateTime {
  const parts = Object.fromEntries(
    parisFormatter.formatToParts(instant).map(({ type, value }) => [type, value]),
  );
  return {
    date: `${parts['year']}-${parts['month']}-${parts['day']}`,
    minutes: Number(parts['hour']) * 60 + Number(parts['minute']),
  };
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

export function hasBookableSlot(date: string, threshold: ParisDateTime): boolean {
  return BOOKING_DURATIONS.some((duration) =>
    listSlotStarts(duration).some((time) => !isSlotTooSoon(date, time, threshold)),
  );
}
