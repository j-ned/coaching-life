import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageContentGateway } from '../domain/gateways/page-content.gateway';
import type { PageContent, PageSlug } from '../domain/models/page-content.model';
import { toPageContent, toPageUpdate } from './page-content.adapter';
import type { PageRow } from './page-content.adapter';
import { API_URL } from '../../../core/config.js';

const BASE = `${API_URL}/api/pages`;

@Injectable()
export class HttpPageContentGateway implements PageContentGateway {
  private readonly http = inject(HttpClient);

  async getBySlug(slug: PageSlug): Promise<PageContent | null> {
    try {
      const row = await firstValueFrom(this.http.get<PageRow>(`${BASE}/${slug}`));
      return toPageContent(row);
    } catch {
      return null;
    }
  }

  async getAll(): Promise<readonly PageContent[]> {
    try {
      const rows = await firstValueFrom(this.http.get<PageRow[]>(`${BASE}`));
      return rows.map(toPageContent);
    } catch {
      return [];
    }
  }

  async update(
    slug: PageSlug,
    data: Partial<Omit<PageContent, 'id' | 'slug' | 'updatedAt'>>,
  ): Promise<PageContent> {
    const row = await firstValueFrom(
      this.http.patch<PageRow>(`${BASE}/${slug}`, toPageUpdate(data), { withCredentials: true }),
    );
    return toPageContent(row);
  }
}
