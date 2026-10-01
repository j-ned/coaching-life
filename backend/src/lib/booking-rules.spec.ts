import { describe, expect, it } from 'vitest';
import { checkBookingRules } from './booking-rules.js';
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
