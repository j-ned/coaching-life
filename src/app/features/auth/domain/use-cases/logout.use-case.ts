import { Injectable, inject } from '@angular/core';
import { AuthGateway } from '../gateways/auth.gateway';

@Injectable({ providedIn: 'root' })
export class LogoutUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(): Promise<void> {
    return this.gateway.logout();
  }
}
