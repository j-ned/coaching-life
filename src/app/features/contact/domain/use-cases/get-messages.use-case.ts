import { Injectable, inject } from '@angular/core';
import { MessageGateway } from '../gateways/message.gateway';
import type { Message } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class GetMessagesUseCase {
  private readonly gateway = inject(MessageGateway);

  execute(): Promise<readonly Message[]> {
    return this.gateway.getAll();
  }
}
