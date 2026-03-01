import { User, Session } from '@supabase/supabase-js';

export type AuthUser = User;
export type AuthSession = Session;

export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'error';
