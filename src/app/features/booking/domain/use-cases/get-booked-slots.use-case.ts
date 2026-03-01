import { Injectable, inject } from '@angular/core';
import { AppointmentGateway } from '../gateways/appointment.gateway';
import type { Appointment } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class GetBookedSlotsUseCase {
  private readonly gateway = inject(AppointmentGateway);

  execute(month: string): Promise<readonly Appointment[]> {
    return this.gateway.getBookedSlots(month);
  }
}
