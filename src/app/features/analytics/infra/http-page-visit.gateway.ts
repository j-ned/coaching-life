import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageVisitGateway } from '../domain/gateways/page-visit.gateway';
import type { PageVisit } from '../domain/models/analytics.model';
import { toPageVisit } from './page-visit.adapter';
import type { PageVisitRow } from './page-visit.adapter';
import { API_URL } from '../../../core/config.js';

const BASE = `${API_URL}/api/analytics`;

@Injectable()
export class HttpPageVisitGateway implements PageVisitGateway {
  private readonly http = inject(HttpClient);

  async trackVisit(pagePath: string, referrer: string, userAgent: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${BASE}/visits`, { page_path: pagePath, referrer, user_agent: userAgent }),
    ).catch(() => null);
  }

  async getVisitsBetween(start: string, end: string): Promise<readonly PageVisit[]> {
    try {
      const rows = await firstValueFrom(
        this.http.get<PageVisitRow[]>(`${BASE}/visits?start=${start}&end=${end}`, {
          withCredentials: true,
        }),
      );
      return rows.map(toPageVisit);
    } catch {
      return [];
    }
  }

  async countVisitsSince(date: string): Promise<number> {
    try {
      const result = await firstValueFrom(
        this.http.get<{ count: number }>(`${BASE}/visits/count?since=${date}`, {
          withCredentials: true,
        }),
      );
      return result.count;
    } catch {
      return 0;
    }
  }
}
