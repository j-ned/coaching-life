import type { SiteSettingValue } from '../domain/models/site-settings.model';

export type SupabaseSiteSettingRow = {
  key: string;
  value: unknown;
  updated_at: string;
};

export function toSiteSetting<T extends SiteSettingValue>(raw: SupabaseSiteSettingRow): T {
  return raw.value as T;
}
