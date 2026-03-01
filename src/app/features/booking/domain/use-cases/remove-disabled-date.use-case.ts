import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { AppointmentGateway } from '../gateways/appointment.gateway';

@Injectable({ providedIn: 'root' })
export class RemoveDisabledDateUseCase {
  private readonly gateway = inject(AppointmentGateway);

  execute(id: string): Observable<void> {
    return this.gateway.removeDisabledDate(id);
  }
}
