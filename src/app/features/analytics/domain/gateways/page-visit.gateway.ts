import type { Observable } from 'rxjs';
import type { PageVisit } from '../models/analytics.model';

export abstract class PageVisitGateway {
  abstract trackVisit(pagePath: string, referrer: string, userAgent: string): Observable<void>;
  abstract getVisitsBetween(start: string, end: string): Observable<readonly PageVisit[]>;
  abstract countVisitsSince(date: string): Observable<number>;
}
