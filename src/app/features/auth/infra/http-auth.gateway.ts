import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { AuthGateway } from '../domain/gateways/auth.gateway';
import { AuthState, AuthUser, AuthSession, LoginCredentials } from '../domain/models/auth.model';
import { Supabase } from '../../../core/services/supabase/supabase';

@Injectable()
export class HttpAuthGateway implements AuthGateway {
  private readonly supabase = inject(Supabase);

  login(credentials: LoginCredentials): Observable<AuthSession | null> {
    return from(
      this.supabase.client.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data.session;
      }),
    );
  }

  logout(): Observable<void> {
    return from(this.supabase.client.auth.signOut()).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }

  getSession(): Observable<AuthSession | null> {
    return from(this.supabase.client.auth.getSession()).pipe(map(({ data }) => data.session));
  }

  getUser(): Observable<AuthUser | null> {
    return from(this.supabase.client.auth.getUser()).pipe(map(({ data }) => data.user));
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
