import { Injectable, inject } from '@angular/core';
import { PageContentGateway } from '../gateways/page-content.gateway';
import type { PageContent, PageSlug } from '../models/page-content.model';

@Injectable({ providedIn: 'root' })
export class GetPageContentUseCase {
  private readonly gateway = inject(PageContentGateway);

  execute(slug: PageSlug): Promise<PageContent | null> {
    return this.gateway.getBySlug(slug);
  }
}
