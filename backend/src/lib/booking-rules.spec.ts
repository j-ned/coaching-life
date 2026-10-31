import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  BOOKING_CLOSING_HOUR,
  BOOKING_DURATIONS,
  BOOKING_LEAD_TIME_MS,
  BOOKING_OPENING_HOUR,
  BOOKING_SLOT_STEP_MINUTES,
  bookingThreshold,
  checkBookingRules,
  isSlotTooSoon,
  listSlotStarts,
} from './booking-rules.js';
import { FIXED_NOW, aBookingRequest } from '../test/booking-fakes.js';

describe('checkBookingRules — règles de calendrier', () => {
  it('accepte un jour ouvré futur', () => {
    const result = checkBookingRules(aBookingRequest({ appointment_date: '2026-10-05' }), FIXED_NOW);

    expect(result).toEqual({ ok: true, duration: 60 });
  });

  it('accepte le 29 février d’une année bissextile', () => {
    const result = checkBookingRules(aBookingRequest({ appointment_date: '2028-02-29' }), FIXED_NOW);

    expect(result).toEqual({ ok: true, duration: 60 });
  });

  it.each(['2026-02-30', '2027-02-29', '2026-13-01', '2026-00-10', '2026-04-31', '2026-10-00'])(
    'refuse la date non calendaire %s',
    (appointment_date) => {
      const result = checkBookingRules(aBookingRequest({ appointment_date }), FIXED_NOW);

      expect(result).toEqual({ ok: false, code: 'invalid_date', message: 'Date invalide.' });
    },
  );

  it.each(['2026-09-30', '2026-09-27', '2025-12-25'])(
    'refuse la date passée %s, même si elle tombe un jour indisponible',
    (appointment_date) => {
      const result = checkBookingRules(aBookingRequest({ appointment_date }), FIXED_NOW);

      expect(result).toEqual({
        ok: false,
        code: 'past_date',
        message: 'Cette date est passée.',
      });
    },
  );

  it("ne traite pas la date du jour à Paris comme passée", () => {
    const result = checkBookingRules(aBookingRequest({ appointment_date: '2026-10-01' }), FIXED_NOW);

    expect(result.ok ? null : result.code).not.toBe('past_date');
  });

  it('juge la date passée selon l’heure de Paris, pas selon UTC', () => {
    const parisJustAfterMidnight = new Date('2026-09-30T22:30:00.000Z');

    const result = checkBookingRules(
      aBookingRequest({ appointment_date: '2026-09-30' }),
      parisJustAfterMidnight,
    );

    expect(result).toEqual({ ok: false, code: 'past_date', message: 'Cette date est passée.' });
  });

  it.each([
    { appointment_date: '2026-12-25', jour: 'Noël, vendredi' },
    { appointment_date: '2027-05-06', jour: 'Ascension, jeudi' },
    { appointment_date: '2026-10-03', jour: 'samedi' },
    { appointment_date: '2026-10-04', jour: 'dimanche' },
  ])('refuse le jour indisponible $appointment_date ($jour)', ({ appointment_date }) => {
    const result = checkBookingRules(aBookingRequest({ appointment_date }), FIXED_NOW);

    expect(result).toEqual({
      ok: false,
      code: 'unavailable_day',
      message: "Ce jour n'est pas ouvert à la réservation.",
    });
  });
});

describe('constantes de réservation', () => {
  it('fixent la plage 9h-18h, le pas de 30 min, les durées 30/60 et le délai de 24 h', () => {
    expect({
      BOOKING_OPENING_HOUR,
      BOOKING_CLOSING_HOUR,
      BOOKING_SLOT_STEP_MINUTES,
      BOOKING_DURATIONS,
      BOOKING_LEAD_TIME_MS,
    }).toEqual({
      BOOKING_OPENING_HOUR: 9,
      BOOKING_CLOSING_HOUR: 18,
      BOOKING_SLOT_STEP_MINUTES: 30,
      BOOKING_DURATIONS: [30, 60],
      BOOKING_LEAD_TIME_MS: 86_400_000,
    });
  });
});

describe('listSlotStarts', () => {
  it('propose en 60 min les débuts de 09:00 à 17:00, toutes les 30 min', () => {
    expect(listSlotStarts(60)).toEqual([
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00',
      '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
    ]);
  });

  it('propose en 30 min les débuts de 09:00 à 17:30, toutes les 30 min', () => {
    expect(listSlotStarts(30)).toEqual([
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00',
      '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    ]);
  });
});

describe('bookingThreshold', () => {
  it.each([
    { instant: '2026-10-01T08:00:00.000Z', date: '2026-10-02', minutes: 600 },
    { instant: '2026-10-24T22:30:00.000Z', date: '2026-10-25', minutes: 1410 },
    { instant: '2026-03-28T22:30:00.000Z', date: '2026-03-30', minutes: 30 },
  ])(
    'place le seuil de $instant à 24 h absolues plus tard, en heure de Paris ($date, $minutes)',
    ({ instant, date, minutes }) => {
      expect(bookingThreshold(new Date(instant))).toEqual({ date, minutes });
    },
  );
});

describe('isSlotTooSoon', () => {
  it.each([
    { date: '2026-10-01', time: '17:30', tooSoon: true },
    { date: '2026-10-02', time: '09:30', tooSoon: true },
    { date: '2026-10-02', time: '10:00', tooSoon: false },
    { date: '2026-10-02', time: '10:30', tooSoon: false },
    { date: '2026-10-05', time: '09:00', tooSoon: false },
  ])('juge $date $time trop proche : $tooSoon', ({ date, time, tooSoon }) => {
    expect(isSlotTooSoon(date, time, bookingThreshold(FIXED_NOW))).toBe(tooSoon);
  });
});

describe('checkBookingRules — règles horaires et délai de prévenance', () => {
  it.each([15, 45, 90, 120])('refuse la durée %i min', (duration) => {
    const result = checkBookingRules(aBookingRequest({ duration }), FIXED_NOW);

    expect(result).toEqual({
      ok: false,
      code: 'invalid_duration',
      message: "Cette durée de rendez-vous n'est pas proposée.",
    });
  });

  it.each([
    { appointment_time: '09:15', duration: 60 },
    { appointment_time: '08:30', duration: 60 },
    { appointment_time: '17:30', duration: 60 },
    { appointment_time: '18:00', duration: 30 },
    { appointment_time: '25:99', duration: 60 },
  ])(
    'refuse l’horaire $appointment_time en $duration min',
    ({ appointment_time, duration }) => {
      const result = checkBookingRules(aBookingRequest({ appointment_time, duration }), FIXED_NOW);

      expect(result).toEqual({
        ok: false,
        code: 'invalid_slot',
        message: "Cet horaire n'est pas proposé.",
      });
    },
  );

  it.each([
    { appointment_time: '17:30', duration: 30 },
    { appointment_time: '17:00', duration: 60 },
    { appointment_time: '09:00', duration: 60 },
  ])('accepte le créneau $appointment_time en $duration min', ({ appointment_time, duration }) => {
    const result = checkBookingRules(aBookingRequest({ appointment_time, duration }), FIXED_NOW);

    expect(result).toEqual({ ok: true, duration });
  });

  it.each([
    { appointment_date: '2026-10-01', appointment_time: '17:00' },
    { appointment_date: '2026-10-02', appointment_time: '09:30' },
  ])(
    'refuse $appointment_date $appointment_time, à moins de 24 h',
    ({ appointment_date, appointment_time }) => {
      const result = checkBookingRules(
        aBookingRequest({ appointment_date, appointment_time }),
        FIXED_NOW,
      );

      expect(result).toEqual({
        ok: false,
        code: 'too_soon',
        message: 'Les rendez-vous doivent être pris au moins 24 h à l\'avance.',
      });
    },
  );

  it('accepte un créneau qui commence exactement 24 h plus tard', () => {
    const result = checkBookingRules(
      aBookingRequest({ appointment_date: '2026-10-02', appointment_time: '10:00' }),
      FIXED_NOW,
    );

    expect(result).toEqual({ ok: true, duration: 60 });
  });

  it.each([
    {
      cas: 'jour indisponible avant durée',
      overrides: { appointment_date: '2026-10-03', duration: 45 },
      code: 'unavailable_day',
    },
    {
      cas: 'durée avant horaire',
      overrides: { appointment_time: '09:15', duration: 45 },
      code: 'invalid_duration',
    },
    {
      cas: 'horaire avant délai de prévenance',
      overrides: { appointment_date: '2026-10-01', appointment_time: '09:15' },
      code: 'invalid_slot',
    },
  ])('signale la première règle violée : $cas', ({ overrides, code }) => {
    const result = checkBookingRules(aBookingRequest(overrides), FIXED_NOW);

    expect(result.ok ? null : result.code).toBe(code);
  });

  it('restreint la durée acceptée aux durées proposées', () => {
    const result = checkBookingRules(aBookingRequest(), FIXED_NOW);

    if (result.ok) expectTypeOf(result.duration).toEqualTypeOf<30 | 60>();
    expect(result).toEqual({ ok: true, duration: 60 });
  });
});
