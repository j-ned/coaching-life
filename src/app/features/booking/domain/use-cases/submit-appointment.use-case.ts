import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { AppointmentGateway } from '../gateways/appointment.gateway';
import type { AppointmentFormData, AppointmentSubmission } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class SubmitAppointmentUseCase {
  private readonly gateway = inject(AppointmentGateway);

  execute(data: AppointmentFormData): Observable<AppointmentSubmission> {
    return this.gateway.submitAppointment(data);
  }
}
