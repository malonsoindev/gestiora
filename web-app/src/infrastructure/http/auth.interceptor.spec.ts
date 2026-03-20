import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  HttpStatusCode,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';

import { authInterceptor, _resetInterceptorState } from './auth.interceptor';
import { SessionService } from '../../core/application/auth/session.service';
import { RefreshUseCase } from '../../core/application/auth/refresh.use-case';

@Component({ standalone: true, template: '' })
class StubComponent {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ACCESS_TOKEN = 'access-token-abc';
const NEW_ACCESS_TOKEN = 'access-token-new';
const REFRESH_TOKEN = 'refresh-token-xyz';

const mockSession = {
  getAccessToken: vi.fn(() => ACCESS_TOKEN as string | null),
  getRefreshToken: vi.fn(() => REFRESH_TOKEN as string | null),
  saveTokens: vi.fn(),
  clearSession: vi.fn(),
  isAuthenticated: vi.fn(() => true),
  isAccessTokenExpired: vi.fn(() => false),
};

const mockRefreshUseCase = {
  execute: vi.fn(),
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', component: StubComponent }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: mockSession },
        { provide: RefreshUseCase, useValue: mockRefreshUseCase },
      ],
    });

    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    _resetInterceptorState();
    try {
      controller.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  // -------------------------------------------------------------------------
  // 1. Authorization header attachment
  // -------------------------------------------------------------------------
  describe('Authorization header', () => {
    it('should attach Bearer token when an access token exists in session', () => {
      mockSession.getAccessToken.mockReturnValue(ACCESS_TOKEN);

      http.get('/api/invoices').subscribe();

      const req = controller.expectOne('/api/invoices');
      expect(req.request.headers.get('Authorization')).toBe(
        `Bearer ${ACCESS_TOKEN}`,
      );
      req.flush({});
    });

    it('should NOT attach Authorization header when there is no access token', () => {
      mockSession.getAccessToken.mockReturnValue(null);

      http.get('/api/invoices').subscribe();

      const req = controller.expectOne('/api/invoices');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });
  });

  // -------------------------------------------------------------------------
  // 2. 401 on auth endpoints — no retry, redirect to /login
  // -------------------------------------------------------------------------
  describe('401 on auth endpoints', () => {
    it('should NOT retry /auth/login on 401 and redirect to /login', async () => {
      const navigateSpy = vi
        .spyOn(router, 'navigate')
        .mockResolvedValue(true);

      http.post('/api/auth/login', {}).subscribe({ error: () => undefined });

      const req = controller.expectOne('/api/auth/login');
      req.flush('Unauthorized', {
        status: HttpStatusCode.Unauthorized,
        statusText: 'Unauthorized',
      });

      await new Promise((r) => setTimeout(r, 0));
      expect(mockRefreshUseCase.execute).not.toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });

    it('should NOT retry /auth/refresh on 401 and redirect to /login', async () => {
      const navigateSpy = vi
        .spyOn(router, 'navigate')
        .mockResolvedValue(true);

      http.post('/api/auth/refresh', {}).subscribe({ error: () => undefined });

      const req = controller.expectOne('/api/auth/refresh');
      req.flush('Unauthorized', {
        status: HttpStatusCode.Unauthorized,
        statusText: 'Unauthorized',
      });

      await new Promise((r) => setTimeout(r, 0));
      expect(mockRefreshUseCase.execute).not.toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });

  // -------------------------------------------------------------------------
  // 3. 401 on protected endpoints — refresh + retry
  // -------------------------------------------------------------------------
  describe('401 on protected endpoints', () => {
    it('should call RefreshUseCase.execute on 401', async () => {
      mockRefreshUseCase.execute.mockReturnValue(
        of({ accessToken: NEW_ACCESS_TOKEN, refreshToken: REFRESH_TOKEN, expiresIn: 900 }),
      );
      // After refresh, getAccessToken returns the new token
      mockSession.getAccessToken.mockReturnValue(NEW_ACCESS_TOKEN);

      http.get('/api/invoices').subscribe({ error: () => undefined });

      // First attempt → 401
      const first = controller.expectOne('/api/invoices');
      first.flush('Unauthorized', {
        status: HttpStatusCode.Unauthorized,
        statusText: 'Unauthorized',
      });

      await new Promise((r) => setTimeout(r, 0));

      expect(mockRefreshUseCase.execute).toHaveBeenCalledOnce();

      // Consume the retry so controller.verify() passes
      const retry = controller.expectOne('/api/invoices');
      retry.flush({});
    });

    it('should retry the original request with the new access token after successful refresh', async () => {
      mockRefreshUseCase.execute.mockReturnValue(
        of({ accessToken: NEW_ACCESS_TOKEN, refreshToken: REFRESH_TOKEN, expiresIn: 900 }),
      );
      mockSession.getAccessToken.mockReturnValue(NEW_ACCESS_TOKEN);

      let result: unknown;
      http.get('/api/invoices').subscribe({ next: (v) => (result = v) });

      // First attempt → 401
      const first = controller.expectOne('/api/invoices');
      first.flush('Unauthorized', {
        status: HttpStatusCode.Unauthorized,
        statusText: 'Unauthorized',
      });

      await new Promise((r) => setTimeout(r, 0));

      // Retry attempt → 200
      const retry = controller.expectOne('/api/invoices');
      expect(retry.request.headers.get('Authorization')).toBe(
        `Bearer ${NEW_ACCESS_TOKEN}`,
      );
      retry.flush({ id: 1 });

      await new Promise((r) => setTimeout(r, 0));
      expect(result).toEqual({ id: 1 });
    });

    it('should clear session and redirect to /login when refresh fails', async () => {
      mockRefreshUseCase.execute.mockReturnValue(
        throwError(() => new Error('refresh failed')),
      );
      const navigateSpy = vi
        .spyOn(router, 'navigate')
        .mockResolvedValue(true);

      http.get('/api/invoices').subscribe({ error: () => undefined });

      const first = controller.expectOne('/api/invoices');
      first.flush('Unauthorized', {
        status: HttpStatusCode.Unauthorized,
        statusText: 'Unauthorized',
      });

      await new Promise((r) => setTimeout(r, 0));

      expect(mockSession.clearSession).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });

    it('should NOT call RefreshUseCase on non-401 HTTP errors', () => {
      http.get('/api/invoices').subscribe({ error: () => undefined });

      const req = controller.expectOne('/api/invoices');
      req.flush('Server error', {
        status: HttpStatusCode.InternalServerError,
        statusText: 'Internal Server Error',
      });

      expect(mockRefreshUseCase.execute).not.toHaveBeenCalled();
    });

    it('should propagate the error to the caller if the retry also returns 401', async () => {
      mockRefreshUseCase.execute.mockReturnValue(
        of({ accessToken: NEW_ACCESS_TOKEN, refreshToken: REFRESH_TOKEN, expiresIn: 900 }),
      );
      mockSession.getAccessToken.mockReturnValue(NEW_ACCESS_TOKEN);

      let caughtError: HttpErrorResponse | undefined;
      http
        .get('/api/invoices')
        .subscribe({ error: (e: HttpErrorResponse) => (caughtError = e) });

      // First attempt → 401
      const first = controller.expectOne('/api/invoices');
      first.flush('Unauthorized', {
        status: HttpStatusCode.Unauthorized,
        statusText: 'Unauthorized',
      });

      await new Promise((r) => setTimeout(r, 0));

      // Retry → also 401
      const retry = controller.expectOne('/api/invoices');
      retry.flush('Unauthorized', {
        status: HttpStatusCode.Unauthorized,
        statusText: 'Unauthorized',
      });

      await new Promise((r) => setTimeout(r, 0));
      expect(caughtError?.status).toBe(HttpStatusCode.Unauthorized);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Concurrent requests during an in-flight refresh
  // -------------------------------------------------------------------------
  describe('concurrent requests during refresh', () => {
    it('should queue a second 401 request and replay it after the first refresh completes', async () => {
      // Use a Subject to control exactly when the refresh resolves,
      // so both 401s arrive while the refresh is still in-flight.
      const refreshSubject = new Subject<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>();
      mockRefreshUseCase.execute.mockReturnValue(refreshSubject.asObservable());
      mockSession.getAccessToken.mockReturnValue(NEW_ACCESS_TOKEN);

      const results: unknown[] = [];

      http.get('/api/invoices').subscribe({ next: (v) => results.push(v) });
      http.get('/api/providers').subscribe({ next: (v) => results.push(v) });

      // Both fail with 401 synchronously — refresh is still in-flight
      const req1 = controller.expectOne('/api/invoices');
      const req2 = controller.expectOne('/api/providers');
      req1.flush('Unauthorized', {
        status: HttpStatusCode.Unauthorized,
        statusText: 'Unauthorized',
      });
      req2.flush('Unauthorized', {
        status: HttpStatusCode.Unauthorized,
        statusText: 'Unauthorized',
      });

      await new Promise((r) => setTimeout(r, 0));

      // Refresh should only be called once (both 401s hit while isRefreshing=true)
      expect(mockRefreshUseCase.execute).toHaveBeenCalledOnce();

      // Now resolve the refresh
      refreshSubject.next({
        accessToken: NEW_ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
        expiresIn: 900,
      });
      refreshSubject.complete();

      await new Promise((r) => setTimeout(r, 0));

      // Both retries succeed
      const retries = controller.match((r) =>
        r.url === '/api/invoices' || r.url === '/api/providers',
      );
      expect(retries).toHaveLength(2);
      retries.forEach((r) => r.flush({ ok: true }));

      await new Promise((r) => setTimeout(r, 0));
      expect(results).toHaveLength(2);
    });
  });
});
