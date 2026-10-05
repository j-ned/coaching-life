import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthGateway } from '@features/auth/domain/gateways/auth.gateway';
import { TrackPageVisitUseCase } from '@features/analytics/domain/use-cases/track-page-visit.use-case';
import { MainLayout } from './main-layout';

const PORTFOLIO_OFFER_URL = 'https://nedellec-julien.fr/offres/site-vitrine';

function renderMainLayout(): HTMLElement {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthGateway, useValue: { authStateChanges: () => of('unauthenticated') } },
      { provide: TrackPageVisitUseCase, useValue: { execute: () => undefined } },
    ],
  });
  const fixture = TestBed.createComponent(MainLayout);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('MainLayout', () => {
  describe('demo banner', () => {
    it('should announce the site as a demonstration in a top-level aside', () => {
      // Given
      const host = renderMainLayout();

      // When
      const banner = host.querySelector('[data-testid="demo-banner"]');

      // Then
      expect(banner?.tagName).toBe('ASIDE');
      expect(banner?.getAttribute('aria-label')).toBe('Site de démonstration');
      expect(banner?.closest('header, main, footer')).toBeNull();
      expect(banner?.textContent).toContain(
        'Coaching Life est une activité fictive, ses coordonnées et témoignages aussi.',
      );
    });

    it('should be rendered before the site header', () => {
      // Given
      const host = renderMainLayout();

      // When
      const banner = host.querySelector('[data-testid="demo-banner"]');
      const header = host.querySelector('header');

      // Then
      expect(banner).not.toBeNull();
      expect(header).not.toBeNull();
      expect(
        banner!.compareDocumentPosition(header!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('should link to the showcase website offer', () => {
      // Given
      const host = renderMainLayout();

      // When
      const link = host.querySelector<HTMLAnchorElement>('[data-testid="demo-banner-link"]');

      // Then
      expect(link?.getAttribute('href')).toBe(PORTFOLIO_OFFER_URL);
      expect(link?.textContent?.trim()).toBe('Le même pour votre activité');
    });
  });
});
