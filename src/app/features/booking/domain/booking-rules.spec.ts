import { hasBookableSlot } from './booking-rules';

describe('hasBookableSlot', () => {
  it.each([
    { date: '2026-09-30', threshold: { date: '2026-10-02', minutes: 600 }, expected: false },
    { date: '2026-10-01', threshold: { date: '2026-10-02', minutes: 600 }, expected: false },
    { date: '2026-10-02', threshold: { date: '2026-10-02', minutes: 600 }, expected: true },
    { date: '2026-10-02', threshold: { date: '2026-10-02', minutes: 1050 }, expected: true },
    { date: '2026-10-02', threshold: { date: '2026-10-02', minutes: 1051 }, expected: false },
    { date: '2026-10-03', threshold: { date: '2026-10-02', minutes: 1051 }, expected: true },
    { date: '2026-10-05', threshold: { date: '2026-10-02', minutes: 600 }, expected: true },
  ])(
    'juge $date réservable ($expected) avec un seuil au $threshold.date à $threshold.minutes min',
    ({ date, threshold, expected }) => {
      expect(hasBookableSlot(date, threshold)).toBe(expected);
    },
  );
});
