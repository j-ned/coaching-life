import { TestBed } from '@angular/core/testing';
import { GetAllAppointmentsUseCase } from './get-all-appointments.use-case';
import { AppointmentGateway } from '../gateways/appointment.gateway';
import { AppointmentBuilder } from '../../test-utils/appointment.builder';

describe('GetAllAppointmentsUseCase', () => {
  it.each([
    {
      label: 'une liste de rendez-vous',
      appointments: [
        AppointmentBuilder.default().with('id', 'apt-001').with('clientName', 'Marie Dupont'),
        AppointmentBuilder.default().with('id', 'apt-002').with('clientName', 'Jean Martin'),
      ],
    },
    {
      label: 'une autre liste de rendez-vous',
      appointments: [
        AppointmentBuilder.default().with('id', 'apt-003').with('coachingType', 'equine-coaching'),
      ],
    },
  ])('should return $label from the gateway', async ({ appointments }) => {
    // Given
    const expected = appointments.map((b) => b.build());
    const gatewayStub: Partial<AppointmentGateway> = {
      getAllAppointments: vi.fn().mockResolvedValue(expected),
    };

    TestBed.configureTestingModule({
      providers: [
        GetAllAppointmentsUseCase,
        { provide: AppointmentGateway, useValue: gatewayStub },
      ],
    });

    const useCase = TestBed.inject(GetAllAppointmentsUseCase);

    // When
    const result = await useCase.execute();

    // Then
    expect(result).toEqual(expected);
  });

  it('should return an empty list when gateway returns no appointments', async () => {
    // Given
    const gatewayStub: Partial<AppointmentGateway> = {
      getAllAppointments: vi.fn().mockResolvedValue([]),
    };

    TestBed.configureTestingModule({
      providers: [
        GetAllAppointmentsUseCase,
        { provide: AppointmentGateway, useValue: gatewayStub },
      ],
    });

    const useCase = TestBed.inject(GetAllAppointmentsUseCase);

    // When
    const result = await useCase.execute();

    // Then
    expect(result).toEqual([]);
  });
});
