import { TestBed } from '@angular/core/testing';
import { SubmitAppointmentUseCase } from './submit-appointment.use-case';
import { AppointmentGateway } from '../gateways/appointment.gateway';
import { AppointmentFormDataBuilder } from '../../test-utils/appointment.builder';
import type { AppointmentSubmission } from '../models/appointment.model';

describe('SubmitAppointmentUseCase', () => {
  it.each([
    {
      label: 'succès',
      submission: {
        success: true,
        message: 'Votre rendez-vous a été réservé avec succès !',
      } satisfies AppointmentSubmission,
    },
    {
      label: 'échec',
      submission: {
        success: false,
        message: 'Une erreur est survenue lors de la réservation.',
      } satisfies AppointmentSubmission,
    },
  ])('should return $label from the gateway', async ({ submission }) => {
    // Given
    const formData = AppointmentFormDataBuilder.default()
      .with('clientName', 'Marie Dupont')
      .with('coachingType', 'personal-development')
      .build();

    const gatewayStub: Partial<AppointmentGateway> = {
      submitAppointment: vi.fn().mockResolvedValue(submission),
    };

    TestBed.configureTestingModule({
      providers: [SubmitAppointmentUseCase, { provide: AppointmentGateway, useValue: gatewayStub }],
    });

    const useCase = TestBed.inject(SubmitAppointmentUseCase);

    // When
    const result = await useCase.execute(formData);

    // Then
    expect(result).toEqual(submission);
    expect(gatewayStub.submitAppointment).toHaveBeenCalledWith(formData);
  });
});
