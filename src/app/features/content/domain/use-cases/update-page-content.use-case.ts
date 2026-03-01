import { Injectable, inject } from '@angular/core';
import { PageContentGateway } from '../gateways/page-content.gateway';
import type { PageContent, PageSlug } from '../models/page-content.model';

@Injectable({ providedIn: 'root' })
export class UpdatePageContentUseCase {
  private readonly gateway = inject(PageContentGateway);

  execute(
    slug: PageSlug,
    data: Partial<Omit<PageContent, 'id' | 'slug' | 'updatedAt'>>,
  ): Promise<PageContent> {
    return this.gateway.update(slug, data);
  }
}
