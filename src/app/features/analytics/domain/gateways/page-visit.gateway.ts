import type { PageVisit } from '../models/analytics.model';

export abstract class PageVisitGateway {
  abstract trackVisit(pagePath: string, referrer: string, userAgent: string): Promise<void>;
  abstract getVisitsBetween(start: string, end: string): Promise<readonly PageVisit[]>;
  abstract countVisitsSince(date: string): Promise<number>;
}
