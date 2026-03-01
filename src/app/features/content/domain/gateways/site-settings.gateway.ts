import type { Observable } from 'rxjs';
import type { SiteSettingKey, SiteSettingValue } from '../models/site-settings.model';

export abstract class SiteSettingsGateway {
  abstract get<T extends SiteSettingValue>(key: SiteSettingKey): Observable<T | null>;
  abstract update<T extends SiteSettingValue>(key: SiteSettingKey, value: T): Observable<T>;
}
