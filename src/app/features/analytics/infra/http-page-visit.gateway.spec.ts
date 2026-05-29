import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpPageVisitGateway } from './http-page-visit.gateway';
import type { PageVisitRow } from './page-visit.adapter';
import { toPageVisit } from './page-visit.adapter';

const PAGE_VISIT_ROW: PageVisitRow = {
  id: 'visit-001',
  page_path: '/life-coach',
  visited_at: '2026-03-01T10:30:00.000Z',
  referrer: 'https://google.com',
  user_agent: 'Mozilla/5.0',
};

describe('HttpPageVisitGateway', () => {
  let gateway: HttpPageVisitGateway;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withFetch()), provideHttpClientTesting(), HttpPageVisitGateway],
    });
    gateway = TestBed.inject(HttpPageVisitGateway);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('trackVisit', () => {
    it('should POST the visit payload in snake_case', async () => {
      const promise = gateway.trackVisit('/life-coach', 'https://google.com', 'Mozilla/5.0');

      const req = httpMock.expectOne('/api/analytics/visits');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        page_path: '/life-coach',
        referrer: 'https://google.com',
        user_agent: 'Mozilla/5.0',
      });
      req.flush({});

      await expect(promise).resolves.toBeUndefined();
    });

    it('should swallow errors and resolve void', async () => {
      const promise = gateway.trackVisit('/life-coach', '', '');

      httpMock
        .expectOne('/api/analytics/visits')
        .flush('boom', { status: 500, statusText: 'Server Error' });

      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('getVisitsBetween', () => {
    it('should GET visits in range with credentials and map rows', async () => {
      const promise = gateway.getVisitsBetween('2026-03-01', '2026-03-31');

      const req = httpMock.expectOne('/api/analytics/visits?start=2026-03-01&end=2026-03-31');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush([PAGE_VISIT_ROW]);

      await expect(promise).resolves.toEqual([toPageVisit(PAGE_VISIT_ROW)]);
    });

    it('should return an empty array when the request fails', async () => {
      const promise = gateway.getVisitsBetween('2026-03-01', '2026-03-31');

      httpMock
        .expectOne('/api/analytics/visits?start=2026-03-01&end=2026-03-31')
        .error(new ProgressEvent('error'));

      await expect(promise).resolves.toEqual([]);
    });
  });

  describe('countVisitsSince', () => {
    it('should GET the count with credentials and return the number', async () => {
      const promise = gateway.countVisitsSince('2026-03-01');

      const req = httpMock.expectOne('/api/analytics/visits/count?since=2026-03-01');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush({ count: 42 });

      await expect(promise).resolves.toBe(42);
    });

    it('should return 0 when the request fails', async () => {
      const promise = gateway.countVisitsSince('2026-03-01');

      httpMock
        .expectOne('/api/analytics/visits/count?since=2026-03-01')
        .flush('boom', { status: 500, statusText: 'Server Error' });

      await expect(promise).resolves.toBe(0);
    });
  });
});
