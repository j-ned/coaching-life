import { Observable } from 'rxjs';
import { AuthSession, AuthState, AuthUser, LoginCredentials } from '../models/auth.model';

export abstract class AuthGateway {
  abstract login(credentials: LoginCredentials): Observable<AuthSession | null>;
  abstract logout(): Observable<void>;
  abstract getSession(): Observable<AuthSession | null>;
  abstract getUser(): Observable<AuthUser | null>;
  abstract authStateChanges(): Observable<AuthState>;
}
