import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { MessageGateway } from '../gateways/message.gateway';
import type { Message } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class GetMessagesUseCase {
  private readonly gateway = inject(MessageGateway);

  execute(): Observable<readonly Message[]> {
    return this.gateway.getAll();
  }
}
