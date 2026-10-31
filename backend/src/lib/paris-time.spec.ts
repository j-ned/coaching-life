import { describe, expect, it } from 'vitest';
import { toParisDateTime } from './paris-time.js';

describe('toParisDateTime', () => {
  it.each([
    { instant: '2026-07-01T07:00:00.000Z', date: '2026-07-01', minutes: 540 },
    { instant: '2026-01-15T08:00:00.000Z', date: '2026-01-15', minutes: 540 },
    { instant: '2026-03-29T00:30:00.000Z', date: '2026-03-29', minutes: 90 },
    { instant: '2026-03-29T01:30:00.000Z', date: '2026-03-29', minutes: 210 },
    { instant: '2026-10-25T00:30:00.000Z', date: '2026-10-25', minutes: 150 },
    { instant: '2026-10-25T01:30:00.000Z', date: '2026-10-25', minutes: 150 },
    { instant: '2026-10-31T23:30:00.000Z', date: '2026-11-01', minutes: 30 },
    { instant: '2026-12-31T22:59:00.000Z', date: '2026-12-31', minutes: 1439 },
    { instant: '2026-12-31T23:00:00.000Z', date: '2027-01-01', minutes: 0 },
  ])('$instant correspond à $date, $minutes min à Paris', ({ instant, date, minutes }) => {
    expect(toParisDateTime(new Date(instant))).toEqual({ date, minutes });
  });
});
