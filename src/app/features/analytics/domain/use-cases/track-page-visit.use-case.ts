import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PageVisitGateway } from '../gateways/page-visit.gateway';

@Injectable({ providedIn: 'root' })
export class TrackPageVisitUseCase {
  private readonly gateway = inject(PageVisitGateway);
  private readonly platformId = inject(PLATFORM_ID);

  execute(pagePath: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const referrer = document.referrer ?? '';
    const userAgent = navigator.userAgent ?? '';

    this.gateway.trackVisit(pagePath, referrer, userAgent).subscribe();
  }
}
