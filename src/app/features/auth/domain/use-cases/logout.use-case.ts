import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthGateway } from '../gateways/auth.gateway';

@Injectable({ providedIn: 'root' })
export class LogoutUseCase {
  private readonly gateway = inject(AuthGateway);

  execute(): Observable<void> {
    return this.gateway.logout();
  }
}
