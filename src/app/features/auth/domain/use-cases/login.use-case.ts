import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthGateway } from '../gateways/auth.gateway';
import { AuthSession, LoginCredentials } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class LoginUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(credentials: LoginCredentials): Observable<AuthSession | null> {
    return this.gateway.login(credentials);
  }
}
