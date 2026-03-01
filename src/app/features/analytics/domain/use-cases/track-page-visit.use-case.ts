import { inject, Injectable } from '@angular/core';
import { PageVisitGateway } from '../gateways/page-visit.gateway';

@Injectable({ providedIn: 'root' })
export class TrackPageVisitUseCase {
  private readonly gateway = inject(PageVisitGateway);

  execute(pagePath: string, referrer: string, userAgent: string): void {
    void this.gateway.trackVisit(pagePath, referrer, userAgent);
  }
}
