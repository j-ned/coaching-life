import { Injectable, inject } from '@angular/core';
import { AppointmentGateway } from '../gateways/appointment.gateway';
import type { Appointment } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class GetAllAppointmentsUseCase {
  private readonly gateway = inject(AppointmentGateway);

  execute(): Promise<readonly Appointment[]> {
    return this.gateway.getAllAppointments();
  }
}
