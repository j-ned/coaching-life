import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { MessageGateway } from '../gateways/message.gateway';
import type { MessageSubmission, SendMessageData } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class SendMessageUseCase {
  private readonly gateway = inject(MessageGateway);

  execute(data: SendMessageData): Observable<MessageSubmission> {
    return this.gateway.send(data);
  }
}
