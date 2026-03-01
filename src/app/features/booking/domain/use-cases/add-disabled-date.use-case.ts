import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { AppointmentGateway } from '../gateways/appointment.gateway';
import type { DisabledDate } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class AddDisabledDateUseCase {
  private readonly gateway = inject(AppointmentGateway);

  execute(date: Omit<DisabledDate, 'id'>): Observable<DisabledDate> {
    return this.gateway.addDisabledDate(date);
  }
}
