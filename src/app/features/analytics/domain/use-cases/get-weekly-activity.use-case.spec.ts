import { TestBed } from '@angular/core/testing';
import { GetWeeklyActivityUseCase } from './get-weekly-activity.use-case';
import { PageVisitGateway } from '../gateways/page-visit.gateway';
import { AppointmentGateway } from '../../../booking/domain/gateways/appointment.gateway';
import { MessageGateway } from '../../../contact/domain/gateways/message.gateway';
import { PageVisitBuilder } from '../../test-utils/page-visit.builder';
import { AppointmentBuilder } from '../../../booking/test-utils/appointment.builder';
import { MessageBuilder } from '../../../contact/test-utils/message.builder';
import type { PeriodFilter } from '../models/analytics.model';

describe('GetWeeklyActivityUseCase', () => {
  const period: PeriodFilter = { year: 2026, month: 3 };

  function setup(overrides?: {
    visits?: ReturnType<typeof PageVisitBuilder.default>[];
    appointments?: ReturnType<typeof AppointmentBuilder.default>[];
    messages?: ReturnType<typeof MessageBuilder.default>[];
  }) {
    const visits = (overrides?.visits ?? []).map((b) => b.build());
    const appointments = (overrides?.appointments ?? []).map((b) => b.build());
    const messages = (overrides?.messages ?? []).map((b) => b.build());

    const pageVisitGatewayStub: Partial<PageVisitGateway> = {
      getVisitsBetween: vi.fn().mockResolvedValue(visits),
    };

    const appointmentGatewayStub: Partial<AppointmentGateway> = {
      getAllAppointments: vi.fn().mockResolvedValue(appointments),
    };

    const messageGatewayStub: Partial<MessageGateway> = {
      getAll: vi.fn().mockResolvedValue(messages),
    };

    TestBed.configureTestingModule({
      providers: [
        GetWeeklyActivityUseCase,
        { provide: PageVisitGateway, useValue: pageVisitGatewayStub },
        { provide: AppointmentGateway, useValue: appointmentGatewayStub },
        { provide: MessageGateway, useValue: messageGatewayStub },
      ],
    });

    return TestBed.inject(GetWeeklyActivityUseCase);
  }

  it('should split March 2026 into 5 weekly data points', async () => {
    // Given
    const useCase = setup();

    // When
    const result = await useCase.execute(period);

    // Then — March 2026 has 31 days → 5 weeks (1-7, 8-14, 15-21, 22-28, 29-31)
    expect(result).toHaveLength(5);
    expect(result[0].weekLabel).toBe('S1');
    expect(result[4].weekLabel).toBe('S5');
  });

  it('should count visits per week', async () => {
    // Given
    const useCase = setup({
      visits: [
        PageVisitBuilder.default().with('visitedAt', '2026-03-02T10:00:00.000Z'),
        PageVisitBuilder.default().with('visitedAt', '2026-03-05T14:00:00.000Z'),
        PageVisitBuilder.default().with('visitedAt', '2026-03-10T09:00:00.000Z'),
      ],
    });

    // When
    const result = await useCase.execute(period);

    // Then — 2 visits in S1 (1-7), 1 visit in S2 (8-14)
    expect(result[0].visits).toBe(2);
    expect(result[1].visits).toBe(1);
    expect(result[2].visits).toBe(0);
  });

  it('should count appointments per week', async () => {
    // Given
    const useCase = setup({
      appointments: [
        AppointmentBuilder.default().with('appointmentDate', '2026-03-15'),
        AppointmentBuilder.default().with('appointmentDate', '2026-03-16'),
        AppointmentBuilder.default().with('appointmentDate', '2026-03-29'),
      ],
    });

    // When
    const result = await useCase.execute(period);

    // Then — 2 in S3 (15-21), 1 in S5 (29-31)
    expect(result[2].appointments).toBe(2);
    expect(result[4].appointments).toBe(1);
  });

  it('should count messages per week', async () => {
    // Given
    const useCase = setup({
      messages: [
        MessageBuilder.default().with('createdAt', '2026-03-22T08:00:00.000Z'),
        MessageBuilder.default().with('createdAt', '2026-03-28T18:00:00.000Z'),
      ],
    });

    // When
    const result = await useCase.execute(period);

    // Then — 2 messages in S4 (22-28)
    expect(result[3].messages).toBe(2);
  });

  it('should return all zeros when no data', async () => {
    // Given
    const useCase = setup();

    // When
    const result = await useCase.execute(period);

    // Then
    for (const week of result) {
      expect(week.visits).toBe(0);
      expect(week.appointments).toBe(0);
      expect(week.messages).toBe(0);
    }
  });

  it('should handle February with 28 days', async () => {
    // Given
    const useCase = setup();
    const febPeriod: PeriodFilter = { year: 2026, month: 2 };

    // When
    const result = await useCase.execute(febPeriod);

    // Then — February 2026 has 28 days → 4 weeks exactly
    expect(result).toHaveLength(4);
  });
});
