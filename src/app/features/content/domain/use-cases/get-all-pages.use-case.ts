import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { PageContentGateway } from '../gateways/page-content.gateway';
import type { PageContent } from '../models/page-content.model';

@Injectable({ providedIn: 'root' })
export class GetAllPagesUseCase {
  private readonly gateway = inject(PageContentGateway);

  execute(): Observable<readonly PageContent[]> {
    return this.gateway.getAll();
  }
}
