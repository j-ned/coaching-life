import type { PageVisit } from '../domain/models/analytics.model';

export type PageVisitRow = {
  readonly id: string;
  readonly page_path: string;
  readonly visited_at: string;
  readonly referrer: string | null;
  readonly user_agent: string | null;
};

export function toPageVisit(raw: PageVisitRow): PageVisit {
  return {
    id: raw.id,
    pagePath: raw.page_path,
    visitedAt: raw.visited_at,
    referrer: raw.referrer ?? '',
    userAgent: raw.user_agent ?? '',
  };
}
