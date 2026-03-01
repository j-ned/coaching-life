import { Injectable, inject } from '@angular/core';
import { AppointmentGateway } from '../gateways/appointment.gateway';

@Injectable({ providedIn: 'root' })
export class RemoveDisabledDateUseCase {
  private readonly gateway = inject(AppointmentGateway);

  execute(id: string): Promise<void> {
    return this.gateway.removeDisabledDate(id);
  }
}
