import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { MessageGateway } from '../gateways/message.gateway';
import type { Message, MessageStatus } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class UpdateMessageStatusUseCase {
  private readonly gateway = inject(MessageGateway);

  execute(id: string, status: MessageStatus): Observable<Message> {
    return this.gateway.updateStatus(id, status);
  }
}
