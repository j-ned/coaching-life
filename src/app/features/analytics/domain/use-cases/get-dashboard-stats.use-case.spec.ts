import { TestBed } from '@angular/core/testing';
import { GetDashboardStatsUseCase } from './get-dashboard-stats.use-case';
import { PageVisitGateway } from '../gateways/page-visit.gateway';
import { AppointmentGateway } from '../../../booking/domain/gateways/appointment.gateway';
import { MessageGateway } from '../../../contact/domain/gateways/message.gateway';
import { AppointmentBuilder } from '../../../booking/test-utils/appointment.builder';
import { MessageBuilder } from '../../../contact/test-utils/message.builder';

describe('GetDashboardStatsUseCase', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T10:00:00.000Z'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  function setup(overrides?: {
    visitCount?: number;
    appointments?: ReturnType<typeof AppointmentBuilder.default>[];
    messages?: ReturnType<typeof MessageBuilder.default>[];
  }) {
    const appointments = (overrides?.appointments ?? []).map((b) => b.build());
    const messages = (overrides?.messages ?? []).map((b) => b.build());

    const pageVisitGatewayStub: Partial<PageVisitGateway> = {
      countVisitsSince: vi.fn().mockResolvedValue(overrides?.visitCount ?? 0),
    };

    const appointmentGatewayStub: Partial<AppointmentGateway> = {
      getAllAppointments: vi.fn().mockResolvedValue(appointments),
    };

    const messageGatewayStub: Partial<MessageGateway> = {
      getAll: vi.fn().mockResolvedValue(messages),
    };

    TestBed.configureTestingModule({
      providers: [
        GetDashboardStatsUseCase,
        { provide: PageVisitGateway, useValue: pageVisitGatewayStub },
        { provide: AppointmentGateway, useValue: appointmentGatewayStub },
        { provide: MessageGateway, useValue: messageGatewayStub },
      ],
    });

    return TestBed.inject(GetDashboardStatsUseCase);
  }

  it('should return visit count from gateway', async () => {
    // Given
    const useCase = setup({ visitCount: 42 });

    // When
    const stats = await useCase.execute();

    // Then
    expect(stats.visitsLast30Days).toBe(42);
  });

  it('should count upcoming appointments (pending or confirmed, date >= today)', async () => {
    // Given
    const useCase = setup({
      appointments: [
        AppointmentBuilder.default()
          .with('appointmentDate', '2026-03-20')
          .with('status', 'pending'),
        AppointmentBuilder.default()
          .with('appointmentDate', '2026-03-25')
          .with('status', 'confirmed'),
        AppointmentBuilder.default()
          .with('appointmentDate', '2026-03-10')
          .with('status', 'pending'),
        AppointmentBuilder.default()
          .with('appointmentDate', '2026-03-20')
          .with('status', 'cancelled'),
        AppointmentBuilder.default()
          .with('appointmentDate', '2026-03-20')
          .with('status', 'completed'),
      ],
    });

    // When
    const stats = await useCase.execute();

    // Then — only future pending + confirmed
    expect(stats.upcomingAppointments).toBe(2);
  });

  it('should count unread messages', async () => {
    // Given
    const useCase = setup({
      messages: [
        MessageBuilder.default().with('status', 'unread'),
        MessageBuilder.default().with('status', 'unread'),
        MessageBuilder.default().with('status', 'read'),
        MessageBuilder.default().with('status', 'archived'),
      ],
    });

    // When
    const stats = await useCase.execute();

    // Then
    expect(stats.unreadMessages).toBe(2);
  });

  it('should compute appointment status breakdown', async () => {
    // Given
    const useCase = setup({
      appointments: [
        AppointmentBuilder.default().with('status', 'pending'),
        AppointmentBuilder.default().with('status', 'pending'),
        AppointmentBuilder.default().with('status', 'confirmed'),
        AppointmentBuilder.default().with('status', 'cancelled'),
      ],
    });

    // When
    const stats = await useCase.execute();

    // Then
    expect(stats.appointmentStatusBreakdown).toEqual({
      pending: 2,
      confirmed: 1,
      cancelled: 1,
      completed: 0,
    });
  });

  it('should compute appointment service breakdown', async () => {
    // Given
    const useCase = setup({
      appointments: [
        AppointmentBuilder.default().with('coachingType', 'life-coaching'),
        AppointmentBuilder.default().with('coachingType', 'life-coaching'),
        AppointmentBuilder.default().with('coachingType', 'equine-coaching'),
      ],
    });

    // When
    const stats = await useCase.execute();

    // Then
    expect(stats.appointmentServiceBreakdown).toEqual({
      'life-coaching': 2,
      'equine-coaching': 1,
    });
  });

  it('should compute message service breakdown', async () => {
    // Given
    const useCase = setup({
      messages: [
        MessageBuilder.default().with('subject', 'life_coach'),
        MessageBuilder.default().with('subject', 'life_coach'),
        MessageBuilder.default().with('subject', 'equine'),
        MessageBuilder.default().with('subject', 'other'),
      ],
    });

    // When
    const stats = await useCase.execute();

    // Then
    expect(stats.messageServiceBreakdown).toEqual({
      life_coach: 2,
      equine: 1,
      other: 1,
    });
  });

  it('should return all zeros when no data exists', async () => {
    // Given
    const useCase = setup();

    // When
    const stats = await useCase.execute();

    // Then
    expect(stats.visitsLast30Days).toBe(0);
    expect(stats.upcomingAppointments).toBe(0);
    expect(stats.unreadMessages).toBe(0);
    expect(stats.appointmentStatusBreakdown).toEqual({
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
    });
  });
});
