import { Injectable, inject } from '@angular/core';
import { AuthGateway } from '../gateways/auth.gateway';
import type { AuthSession, LoginCredentials } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class LoginUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(credentials: LoginCredentials): Promise<AuthSession | null> {
    return this.gateway.login(credentials);
  }
}
