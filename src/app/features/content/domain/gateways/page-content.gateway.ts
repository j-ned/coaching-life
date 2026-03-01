import type { Observable } from 'rxjs';
import type { PageContent, PageSlug } from '../models/page-content.model';

export abstract class PageContentGateway {
  abstract getBySlug(slug: PageSlug): Observable<PageContent | null>;
  abstract getAll(): Observable<readonly PageContent[]>;
  abstract update(slug: PageSlug, data: Partial<Omit<PageContent, 'id' | 'slug' | 'updatedAt'>>): Observable<PageContent>;
}
