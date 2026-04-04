export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type AuthSession = {
  userId: string;
  expire: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'error';
