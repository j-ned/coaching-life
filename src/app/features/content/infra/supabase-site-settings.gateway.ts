import { Injectable, inject } from '@angular/core';
import { SiteSettingsGateway } from '../domain/gateways/site-settings.gateway';
import type { SiteSettingKey, SiteSettingValue } from '../domain/models/site-settings.model';
import { Supabase } from '../../../core/services/supabase/supabase';
import { toSiteSetting } from './site-settings.adapter';

@Injectable()
export class SupabaseSiteSettingsGateway implements SiteSettingsGateway {
  private readonly supabase = inject(Supabase);

  async get<T extends SiteSettingValue>(key: SiteSettingKey): Promise<T | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('site_settings')
        .select('*')
        .eq('key', key)
        .single();
      if (error || !data) return null;
      return toSiteSetting<T>(data);
    } catch {
      return null;
    }
  }

  async update<T extends SiteSettingValue>(key: SiteSettingKey, value: T): Promise<T> {
    const { data, error } = await this.supabase.client
      .from('site_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      .select()
      .single();
    if (error) throw error;
    return toSiteSetting<T>(data!);
  }
}
