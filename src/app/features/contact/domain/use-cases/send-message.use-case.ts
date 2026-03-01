import { Injectable, inject } from '@angular/core';
import { MessageGateway } from '../gateways/message.gateway';
import type { MessageSubmission, SendMessageData } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class SendMessageUseCase {
  private readonly gateway = inject(MessageGateway);

  execute(data: SendMessageData): Promise<MessageSubmission> {
    return this.gateway.send(data);
  }
}
