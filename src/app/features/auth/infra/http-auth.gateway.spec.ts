import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom, take, toArray } from 'rxjs';
import { HttpAuthGateway } from './http-auth.gateway';
import type { AuthSession, AuthUser, LoginCredentials } from '../domain/models/auth.model';

const CREDENTIALS: LoginCredentials = {
  email: 'admin@coaching-life.fr',
  password: 'secret',
};

const SESSION: AuthSession = {
  userId: 'user-001',
  expire: '2026-06-01T00:00:00.000Z',
};

const USER: AuthUser = {
  id: 'user-001',
  email: 'admin@coaching-life.fr',
  name: 'Admin',
};

describe('HttpAuthGateway', () => {
  let gateway: HttpAuthGateway;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
        HttpAuthGateway,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    gateway = TestBed.inject(HttpAuthGateway);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('login', () => {
    it('should POST credentials with credentials and return the session', async () => {
      const promise = gateway.login(CREDENTIALS);

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(CREDENTIALS);
      expect(req.request.withCredentials).toBe(true);
      req.flush(SESSION);

      await expect(promise).resolves.toEqual(SESSION);
    });

    it('should return null when login fails', async () => {
      const promise = gateway.login(CREDENTIALS);

      httpMock
        .expectOne('/api/auth/login')
        .flush('invalid', { status: 401, statusText: 'Unauthorized' });

      await expect(promise).resolves.toBeNull();
    });
  });

  describe('logout', () => {
    it('should POST to logout with credentials', async () => {
      const promise = gateway.logout();

      const req = httpMock.expectOne('/api/auth/logout');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      expect(req.request.withCredentials).toBe(true);
      req.flush({});

      await expect(promise).resolves.toBeUndefined();
    });

    it('should resolve even when logout fails', async () => {
      const promise = gateway.logout();

      httpMock
        .expectOne('/api/auth/logout')
        .flush('boom', { status: 500, statusText: 'Server Error' });

      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('getSession', () => {
    it('should GET the session with credentials', async () => {
      const promise = gateway.getSession();

      const req = httpMock.expectOne('/api/auth/session');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(SESSION);

      await expect(promise).resolves.toEqual(SESSION);
    });

    it('should return null when there is no session', async () => {
      const promise = gateway.getSession();

      httpMock
        .expectOne('/api/auth/session')
        .flush('no session', { status: 401, statusText: 'Unauthorized' });

      await expect(promise).resolves.toBeNull();
    });
  });

  describe('getUser', () => {
    it('should GET the current user with credentials', async () => {
      const promise = gateway.getUser();

      const req = httpMock.expectOne('/api/auth/me');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(USER);

      await expect(promise).resolves.toEqual(USER);
    });

    it('should return null when unauthenticated', async () => {
      const promise = gateway.getUser();

      httpMock
        .expectOne('/api/auth/me')
        .flush('no user', { status: 401, statusText: 'Unauthorized' });

      await expect(promise).resolves.toBeNull();
    });
  });

  describe('authStateChanges (browser)', () => {
    it('should emit "loading" then "authenticated" when /me succeeds', async () => {
      const states = firstValueFrom(gateway.authStateChanges().pipe(take(2), toArray()));

      const req = httpMock.expectOne('/api/auth/me');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(USER);

      await expect(states).resolves.toEqual(['loading', 'authenticated']);
    });

    it('should emit "loading" then "unauthenticated" when /me fails', async () => {
      const states = firstValueFrom(gateway.authStateChanges().pipe(take(2), toArray()));

      httpMock
        .expectOne('/api/auth/me')
        .flush('no user', { status: 401, statusText: 'Unauthorized' });

      await expect(states).resolves.toEqual(['loading', 'unauthenticated']);
    });
  });
});
