import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { MessageGateway } from '../gateways/message.gateway';

@Injectable({ providedIn: 'root' })
export class DeleteMessageUseCase {
  private readonly gateway = inject(MessageGateway);

  execute(id: string): Observable<void> {
    return this.gateway.delete(id);
  }
}
