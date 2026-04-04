import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { AuthGateway } from '../domain/gateways/auth.gateway';
import type {
  AuthState,
  AuthUser,
  AuthSession,
  LoginCredentials,
} from '../domain/models/auth.model';
import { API_URL } from '../../../core/config.js';

const BASE = `${API_URL}/api/auth`;

@Injectable()
export class HttpAuthGateway implements AuthGateway {
  private readonly http = inject(HttpClient);

  async login(credentials: LoginCredentials): Promise<AuthSession | null> {
    try {
      return await firstValueFrom(
        this.http.post<AuthSession>(`${BASE}/login`, credentials, { withCredentials: true }),
      );
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post(`${BASE}/logout`, {}, { withCredentials: true })).catch(
      () => null,
    );
  }

  async getSession(): Promise<AuthSession | null> {
    try {
      return await firstValueFrom(
        this.http.get<AuthSession>(`${BASE}/session`, { withCredentials: true }),
      );
    } catch {
      return null;
    }
  }

  async getUser(): Promise<AuthUser | null> {
    try {
      return await firstValueFrom(this.http.get<AuthUser>(`${BASE}/me`, { withCredentials: true }));
    } catch {
      return null;
    }
  }

  authStateChanges(): Observable<AuthState> {
    return new Observable<AuthState>((observer) => {
      observer.next('loading');
      firstValueFrom(this.http.get<AuthUser>(`${BASE}/me`, { withCredentials: true }))
        .then(() => observer.next('authenticated'))
        .catch(() => observer.next('unauthenticated'));
    });
  }
}
