import { Injectable, inject } from '@angular/core';
import { AppointmentGateway } from '../gateways/appointment.gateway';
import type { AppointmentFormData, AppointmentSubmission } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class SubmitAppointmentUseCase {
  private readonly gateway = inject(AppointmentGateway);

  execute(data: AppointmentFormData): Promise<AppointmentSubmission> {
    return this.gateway.submitAppointment(data);
  }
}
