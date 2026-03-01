import { Injectable, inject } from '@angular/core';
import { PageContentGateway } from '../gateways/page-content.gateway';
import type { PageContent } from '../models/page-content.model';

@Injectable({ providedIn: 'root' })
export class GetAllPagesUseCase {
  private readonly gateway = inject(PageContentGateway);

  execute(): Promise<readonly PageContent[]> {
    return this.gateway.getAll();
  }
}
