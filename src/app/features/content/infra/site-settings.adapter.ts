import type { SiteSettingValue } from '../domain/models/site-settings.model';

export type SiteSettingRow = {
  key: string;
  value: unknown;
  updated_at: string;
};

export function toSiteSetting<T extends SiteSettingValue>(raw: SiteSettingRow): T {
  return raw.value as T;
}
