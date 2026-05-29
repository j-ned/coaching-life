import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpSiteSettingsGateway } from './http-site-settings.gateway';
import type { SiteSettingRow } from './site-settings.adapter';
import type { HeroSettings } from '../domain/models/site-settings.model';
import { HeroSettingsBuilder } from '../test-utils/page-content.builder';

describe('HttpSiteSettingsGateway', () => {
  let gateway: HttpSiteSettingsGateway;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
        HttpSiteSettingsGateway,
      ],
    });
    gateway = TestBed.inject(HttpSiteSettingsGateway);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('get', () => {
    it('should GET the setting by key and unwrap the value', async () => {
      const hero = HeroSettingsBuilder.default().build();
      const row: SiteSettingRow = {
        key: 'home_hero',
        value: hero,
        updated_at: '2026-02-28T10:00:00.000Z',
      };

      const promise = gateway.get<HeroSettings>('home_hero');

      const req = httpMock.expectOne('/api/settings/home_hero');
      expect(req.request.method).toBe('GET');
      req.flush(row);

      await expect(promise).resolves.toEqual(hero);
    });

    it('should return null when the request fails', async () => {
      const promise = gateway.get<HeroSettings>('home_hero');

      httpMock
        .expectOne('/api/settings/home_hero')
        .flush('boom', { status: 500, statusText: 'Server Error' });

      await expect(promise).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('should PUT the wrapped value with credentials and unwrap the response', async () => {
      const hero = HeroSettingsBuilder.default().with('title', 'Nouveau titre').build();
      const row: SiteSettingRow = {
        key: 'home_hero',
        value: hero,
        updated_at: '2026-03-01T10:00:00.000Z',
      };

      const promise = gateway.update<HeroSettings>('home_hero', hero);

      const req = httpMock.expectOne('/api/settings/home_hero');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ value: hero });
      expect(req.request.withCredentials).toBe(true);
      req.flush(row);

      await expect(promise).resolves.toEqual(hero);
    });
  });
});
