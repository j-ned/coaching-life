import { Injectable, inject } from '@angular/core';
import { MessageGateway } from '../gateways/message.gateway';

@Injectable({ providedIn: 'root' })
export class DeleteMessageUseCase {
  private readonly gateway = inject(MessageGateway);

  execute(id: string): Promise<void> {
    return this.gateway.delete(id);
  }
}
