import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { SiteSettingsGateway } from '../domain/gateways/site-settings.gateway';
import type { SiteSettingKey, SiteSettingValue } from '../domain/models/site-settings.model';
import { Supabase } from '../../../core/services/supabase/supabase';
import { toSiteSetting } from './site-settings.adapter';

@Injectable()
export class SupabaseSiteSettingsGateway extends SiteSettingsGateway {
  private readonly supabase = inject(Supabase);

  get<T extends SiteSettingValue>(key: SiteSettingKey): Observable<T | null> {
    return from(
      this.supabase.client.from('site_settings').select('*').eq('key', key).single(),
    ).pipe(
      map(({ data, error }) => {
        if (error || !data) return null;
        return toSiteSetting<T>(data);
      }),
      catchError(() => of(null)),
    );
  }

  update<T extends SiteSettingValue>(key: SiteSettingKey, value: T): Observable<T> {
    return from(
      this.supabase.client
        .from('site_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
        .select()
        .single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return toSiteSetting<T>(data!);
      }),
    );
  }
}
