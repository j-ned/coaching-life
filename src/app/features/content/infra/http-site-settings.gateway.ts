import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SiteSettingsGateway } from '../domain/gateways/site-settings.gateway';
import type { SiteSettingKey, SiteSettingValue } from '../domain/models/site-settings.model';
import { toSiteSetting } from './site-settings.adapter';
import type { SiteSettingRow } from './site-settings.adapter';
import { API_URL } from '../../../core/config.js';

const BASE = `${API_URL}/api/settings`;

@Injectable()
export class HttpSiteSettingsGateway implements SiteSettingsGateway {
  private readonly http = inject(HttpClient);

  async get<T extends SiteSettingValue>(key: SiteSettingKey): Promise<T | null> {
    try {
      const row = await firstValueFrom(this.http.get<SiteSettingRow>(`${BASE}/${key}`));
      return toSiteSetting<T>(row);
    } catch {
      return null;
    }
  }

  async update<T extends SiteSettingValue>(key: SiteSettingKey, value: T): Promise<T> {
    const row = await firstValueFrom(
      this.http.put<SiteSettingRow>(`${BASE}/${key}`, { value }, { withCredentials: true }),
    );
    return toSiteSetting<T>(row);
  }
}
