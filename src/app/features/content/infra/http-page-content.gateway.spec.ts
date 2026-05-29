import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpPageContentGateway } from './http-page-content.gateway';
import type { PageRow } from './page-content.adapter';
import { toPageContent } from './page-content.adapter';

const PAGE_ROW: PageRow = {
  id: 'page-001',
  updated_at: '2026-02-28T10:00:00.000Z',
  slug: 'life-coach',
  title: 'Coaching de Vie',
  introduction: 'Découvrez notre approche unique du coaching de vie.',
  section_title: 'Nos Services',
  items: [{ title: 'Confiance en soi', description: 'Travaillez votre confiance.' }],
  extra_text: 'Contactez-nous pour en savoir plus.',
  image_url: 'https://example.com/life-coach.jpg',
  image_alt: 'Séance de coaching de vie',
};

describe('HttpPageContentGateway', () => {
  let gateway: HttpPageContentGateway;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
        HttpPageContentGateway,
      ],
    });
    gateway = TestBed.inject(HttpPageContentGateway);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getBySlug', () => {
    it('should GET the page by slug and map the row to domain', async () => {
      const promise = gateway.getBySlug('life-coach');

      const req = httpMock.expectOne('/api/pages/life-coach');
      expect(req.request.method).toBe('GET');
      req.flush(PAGE_ROW);

      await expect(promise).resolves.toEqual(toPageContent(PAGE_ROW));
    });

    it('should return null when the page is not found', async () => {
      const promise = gateway.getBySlug('life-coach');

      httpMock
        .expectOne('/api/pages/life-coach')
        .flush('not found', { status: 404, statusText: 'Not Found' });

      await expect(promise).resolves.toBeNull();
    });
  });

  describe('getAll', () => {
    it('should GET all pages and map rows to domain', async () => {
      const promise = gateway.getAll();

      const req = httpMock.expectOne('/api/pages');
      expect(req.request.method).toBe('GET');
      req.flush([PAGE_ROW]);

      await expect(promise).resolves.toEqual([toPageContent(PAGE_ROW)]);
    });

    it('should return an empty array on network error', async () => {
      const promise = gateway.getAll();

      httpMock.expectOne('/api/pages').error(new ProgressEvent('error'));

      await expect(promise).resolves.toEqual([]);
    });
  });

  describe('update', () => {
    it('should PATCH only the changed fields (snake_case) with credentials', async () => {
      const updated: PageRow = { ...PAGE_ROW, title: 'Nouveau titre' };

      const promise = gateway.update('life-coach', {
        title: 'Nouveau titre',
        sectionTitle: 'Nouvelle section',
      });

      const req = httpMock.expectOne('/api/pages/life-coach');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({
        title: 'Nouveau titre',
        section_title: 'Nouvelle section',
      });
      expect(req.request.withCredentials).toBe(true);
      req.flush(updated);

      await expect(promise).resolves.toEqual(toPageContent(updated));
    });
  });
});
