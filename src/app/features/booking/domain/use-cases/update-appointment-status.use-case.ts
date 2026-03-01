import { Injectable, inject } from '@angular/core';
import { AppointmentGateway } from '../gateways/appointment.gateway';
import type { Appointment, AppointmentStatus } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class UpdateAppointmentStatusUseCase {
  private readonly gateway = inject(AppointmentGateway);

  execute(id: string, status: AppointmentStatus): Promise<Appointment> {
    return this.gateway.updateStatus(id, status);
  }
}
