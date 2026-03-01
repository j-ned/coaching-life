import type { Observable } from 'rxjs';
import type { AuthSession, AuthState, AuthUser, LoginCredentials } from '../models/auth.model';

export abstract class AuthGateway {
  abstract login(credentials: LoginCredentials): Promise<AuthSession | null>;
  abstract logout(): Promise<void>;
  abstract getSession(): Promise<AuthSession | null>;
  abstract getUser(): Promise<AuthUser | null>;
  abstract authStateChanges(): Observable<AuthState>;
}
