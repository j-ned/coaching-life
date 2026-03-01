import { Injectable, inject } from '@angular/core';
import { AppointmentGateway } from '../gateways/appointment.gateway';

@Injectable({ providedIn: 'root' })
export class DeleteAppointmentUseCase {
  private readonly gateway = inject(AppointmentGateway);

  execute(id: string): Promise<void> {
    return this.gateway.deleteAppointment(id);
  }
}
