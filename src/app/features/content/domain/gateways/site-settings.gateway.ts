import type { SiteSettingKey, SiteSettingValue } from '../models/site-settings.model';

export abstract class SiteSettingsGateway {
  abstract get<T extends SiteSettingValue>(key: SiteSettingKey): Promise<T | null>;
  abstract update<T extends SiteSettingValue>(key: SiteSettingKey, value: T): Promise<T>;
}
