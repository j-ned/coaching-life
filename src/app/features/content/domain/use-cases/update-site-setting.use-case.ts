import { Injectable, inject } from '@angular/core';
import { SiteSettingsGateway } from '../gateways/site-settings.gateway';
import type { SiteSettingKey, SiteSettingValue } from '../models/site-settings.model';

@Injectable({ providedIn: 'root' })
export class UpdateSiteSettingUseCase {
  private readonly gateway = inject(SiteSettingsGateway);

  execute<T extends SiteSettingValue>(key: SiteSettingKey, value: T): Promise<T> {
    return this.gateway.update(key, value);
  }
}
