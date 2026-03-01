import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { AppointmentGateway } from '../gateways/appointment.gateway';
import type { DisabledDate } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class GetDisabledDatesUseCase {
  private readonly gateway = inject(AppointmentGateway);

  execute(): Observable<readonly DisabledDate[]> {
    return this.gateway.getDisabledDates();
  }
}
