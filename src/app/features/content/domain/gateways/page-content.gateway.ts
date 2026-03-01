import type { PageContent, PageSlug } from '../models/page-content.model';

export abstract class PageContentGateway {
  abstract getBySlug(slug: PageSlug): Promise<PageContent | null>;
  abstract getAll(): Promise<readonly PageContent[]>;
  abstract update(
    slug: PageSlug,
    data: Partial<Omit<PageContent, 'id' | 'slug' | 'updatedAt'>>,
  ): Promise<PageContent>;
}
