import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthGateway } from '../domain/gateways/auth.gateway';
import type {
  AuthState,
  AuthUser,
  AuthSession,
  LoginCredentials,
} from '../domain/models/auth.model';
import { Supabase } from '../../../core/services/supabase/supabase';

@Injectable()
export class HttpAuthGateway implements AuthGateway {
  private readonly supabase = inject(Supabase);

  async login(credentials: LoginCredentials): Promise<AuthSession | null> {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    if (error) throw error;
    return data.session;
  }

  async logout(): Promise<void> {
    const { error } = await this.supabase.client.auth.signOut();
    if (error) throw error;
  }

  async getSession(): Promise<AuthSession | null> {
    const { data } = await this.supabase.client.auth.getSession();
    return data.session;
  }

  async getUser(): Promise<AuthUser | null> {
    const { data } = await this.supabase.client.auth.getUser();
    return data.user;
  }

  authStateChanges(): Observable<AuthState> {
    return new Observable<AuthState>((observer) => {
      observer.next('loading');

      const {
        data: { subscription },
      } = this.supabase.client.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') {
          observer.next(session ? 'authenticated' : 'unauthenticated');
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          observer.next('authenticated');
        } else if (event === 'SIGNED_OUT') {
          observer.next('unauthenticated');
        }
      });

      return () => subscription.unsubscribe();
    });
  }
}
