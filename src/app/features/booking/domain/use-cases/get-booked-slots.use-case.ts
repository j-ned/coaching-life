import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { AppointmentGateway } from '../gateways/appointment.gateway';
import type { Appointment } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class GetBookedSlotsUseCase {
  private readonly gateway = inject(AppointmentGateway);

  execute(month: string): Observable<readonly Appointment[]> {
    return this.gateway.getBookedSlots(month);
  }
}
