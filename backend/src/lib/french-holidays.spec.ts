import { describe, expect, it } from 'vitest';
import { getUnavailableDayReason } from './french-holidays.js';

describe('getUnavailableDayReason', () => {
  it.each([
    { date: '2026-01-01', reason: 'Jour de l’An' },
    { date: '2026-04-06', reason: 'Lundi de Pâques' },
    { date: '2026-05-14', reason: 'Ascension' },
    { date: '2026-05-25', reason: 'Lundi de Pentecôte' },
    { date: '2026-07-14', reason: 'Fête nationale' },
    { date: '2026-12-25', reason: 'Noël' },
    { date: '2027-05-06', reason: 'Ascension' },
    { date: '2026-11-01', reason: 'Toussaint' },
    { date: '2026-10-03', reason: 'Weekend' },
    { date: '2026-10-04', reason: 'Weekend' },
  ])('$date est indisponible : $reason', ({ date, reason }) => {
    expect(getUnavailableDayReason(date)).toBe(reason);
  });

  it.each(['2026-10-02', '2026-10-05', '2026-12-24', '2027-05-07'])(
    '%s est un jour ouvré réservable',
    (date) => {
      expect(getUnavailableDayReason(date)).toBeNull();
    },
  );
});
