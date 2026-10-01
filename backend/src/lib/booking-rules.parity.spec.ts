import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as front from '../../../src/app/features/booking/domain/booking-rules.js';
import {
  getFrenchHolidays,
  getUnavailableReason,
} from '../../../src/app/shared/calendar/french-holidays.js';
import * as back from './booking-rules.js';
import { getUnavailableDayReason } from './french-holidays.js';
import { toParisDateTime } from './paris-time.js';

const FRONT_RULE_FILES = [
  '../../../src/app/features/booking/domain/booking-rules.ts',
  '../../../src/app/shared/calendar/french-holidays.ts',
];

const SAMPLE_INSTANTS = [
  '2026-10-01T08:00:00Z',
  '2026-10-01T15:30:00Z',
  '2026-10-01T15:31:00Z',
  '2026-01-15T08:00:00Z',
  '2026-07-01T07:00:00Z',
  '2026-03-28T22:30:00Z',
  '2026-03-29T00:30:00Z',
  '2026-03-29T01:30:00Z',
  '2026-10-24T22:30:00Z',
  '2026-10-25T00:30:00Z',
  '2026-10-25T01:30:00Z',
  '2026-10-31T23:30:00Z',
  '2026-12-31T22:59:00Z',
  '2026-12-31T23:00:00Z',
];

const DAY_MS = 24 * 60 * 60 * 1000;

function shiftIsoDate(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function isoDatesBetween(first: string, last: string): string[] {
  const dates: string[] = [];
  for (let date = first; date <= last; date = shiftIsoDate(date, 1)) dates.push(date);
  return dates;
}

describe('parité des règles de réservation front/back', () => {
  it.each(FRONT_RULE_FILES)('%s n’importe rien, pour rester chargeable par le backend', (file) => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');

    expect(source).not.toMatch(/^\s*import\s/m);
  });

  it('partage les mêmes constantes', () => {
    expect({
      opening: front.BOOKING_OPENING_HOUR,
      closing: front.BOOKING_CLOSING_HOUR,
      step: front.BOOKING_SLOT_STEP_MINUTES,
      durations: front.BOOKING_DURATIONS,
      leadTime: front.BOOKING_LEAD_TIME_MS,
    }).toEqual({
      opening: back.BOOKING_OPENING_HOUR,
      closing: back.BOOKING_CLOSING_HOUR,
      step: back.BOOKING_SLOT_STEP_MINUTES,
      durations: back.BOOKING_DURATIONS,
      leadTime: back.BOOKING_LEAD_TIME_MS,
    });
  });

  it.each(back.BOOKING_DURATIONS)('propose les mêmes débuts de créneau en %i min', (duration) => {
    expect(front.listSlotStarts(duration)).toEqual(back.listSlotStarts(duration));
  });

  it.each(SAMPLE_INSTANTS)('convertit %s dans la même heure de Paris', (instant) => {
    expect(front.toParisDateTime(new Date(instant))).toEqual(toParisDateTime(new Date(instant)));
  });

  it.each(SAMPLE_INSTANTS)('place le seuil de prévenance au même instant pour %s', (instant) => {
    expect(front.bookingThreshold(new Date(instant))).toEqual(
      back.bookingThreshold(new Date(instant)),
    );
  });

  it.each(SAMPLE_INSTANTS)(
    'juge trop proches les mêmes créneaux autour du seuil pour %s',
    (instant) => {
      const threshold = back.bookingThreshold(new Date(instant));
      const verdicts = [-1, 0, 1].flatMap((offset) => {
        const date = shiftIsoDate(threshold.date, offset);
        return back.BOOKING_DURATIONS.flatMap((duration) =>
          back.listSlotStarts(duration).map((time) => ({
            date,
            time,
            front: front.isSlotTooSoon(date, time, front.bookingThreshold(new Date(instant))),
            back: back.isSlotTooSoon(date, time, threshold),
          })),
        );
      });

      expect(verdicts.filter((verdict) => verdict.front !== verdict.back)).toEqual([]);
      expect(new Set(verdicts.map((verdict) => verdict.back))).toEqual(new Set([true, false]));
    },
  );

  it('donne la même disponibilité, raison comprise, pour chaque jour de 2025 à 2035', () => {
    const days = isoDatesBetween('2025-01-01', '2035-12-31');
    const divergences = days
      .map((iso) => {
        const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
        return {
          iso,
          front: getUnavailableReason(new Date(year, month - 1, day), getFrenchHolidays(year)),
          back: getUnavailableDayReason(iso),
        };
      })
      .filter((comparison) => comparison.front !== comparison.back);

    expect(days).toHaveLength(4017);
    expect(divergences).toEqual([]);
  });
});
