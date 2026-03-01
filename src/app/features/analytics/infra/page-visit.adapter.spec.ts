import { toPageVisit } from './page-visit.adapter';
import type { SupabasePageVisitRow } from './page-visit.adapter';

describe('page-visit.adapter', () => {
  describe('toPageVisit', () => {
    it.each([
      {
        label: 'une visite complète',
        row: {
          id: 'visit-001',
          page_path: '/life-coach',
          visited_at: '2026-03-01T10:30:00.000Z',
          referrer: 'https://google.com',
          user_agent: 'Mozilla/5.0',
        } satisfies SupabasePageVisitRow,
        expected: {
          id: 'visit-001',
          pagePath: '/life-coach',
          visitedAt: '2026-03-01T10:30:00.000Z',
          referrer: 'https://google.com',
          userAgent: 'Mozilla/5.0',
        },
      },
      {
        label: 'une visite avec champs null',
        row: {
          id: 'visit-002',
          page_path: '/booking',
          visited_at: '2026-03-02T14:00:00.000Z',
          referrer: null,
          user_agent: null,
        } satisfies SupabasePageVisitRow,
        expected: {
          id: 'visit-002',
          pagePath: '/booking',
          visitedAt: '2026-03-02T14:00:00.000Z',
          referrer: '',
          userAgent: '',
        },
      },
    ])('should convert $label from snake_case to camelCase', ({ row, expected }) => {
      // When
      const result = toPageVisit(row);

      // Then
      expect(result).toEqual(expected);
    });
  });
});
