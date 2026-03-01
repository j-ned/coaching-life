import { TestBed } from '@angular/core/testing';
import { TrackPageVisitUseCase } from './track-page-visit.use-case';
import { PageVisitGateway } from '../gateways/page-visit.gateway';

describe('TrackPageVisitUseCase', () => {
  function setup() {
    const gatewayStub: Partial<PageVisitGateway> = {
      trackVisit: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [TrackPageVisitUseCase, { provide: PageVisitGateway, useValue: gatewayStub }],
    });

    return {
      useCase: TestBed.inject(TrackPageVisitUseCase),
      gateway: gatewayStub,
    };
  }

  it('should delegate to gateway with correct parameters', () => {
    // Given
    const { useCase, gateway } = setup();

    // When
    useCase.execute('/life-coach', 'https://google.com', 'Mozilla/5.0');

    // Then
    expect(gateway.trackVisit).toHaveBeenCalledWith(
      '/life-coach',
      'https://google.com',
      'Mozilla/5.0',
    );
  });

  it('should call gateway exactly once per execution', () => {
    // Given
    const { useCase, gateway } = setup();

    // When
    useCase.execute('/booking', '', 'Safari');

    // Then
    expect(gateway.trackVisit).toHaveBeenCalledTimes(1);
  });
});
