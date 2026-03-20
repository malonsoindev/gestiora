import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { SessionService } from '../../core/application/auth/session.service';
import { RefreshUseCase } from '../../core/application/auth/refresh.use-case';
import { AuthTokens } from '../../core/domain/auth/auth-tokens.model';

/** Endpoints that must NOT trigger a refresh-and-retry cycle. */
const AUTH_PATHS = ['/auth/login', '/auth/refresh'];

/** Tracks whether a token refresh is currently in progress. */
let isRefreshing = false;

/**
 * Emits `null` while a refresh is in flight.
 * Emits the new access token once the refresh completes.
 * All queued requests subscribe and wait for the first non-null emission.
 */
const refreshToken$ = new BehaviorSubject<string | null>(null);

/**
 * Resets module-level refresh state.
 * Exposed only for unit-test teardown — do NOT call in production code.
 */
export function _resetInterceptorState(): void {
  isRefreshing = false;
  refreshToken$.next(null);
}

/** Attach a Bearer token to the cloned request. */
function addAuthHeader(req: Parameters<HttpInterceptorFn>[0], token: string) {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/** True if the URL is one of the excluded auth endpoints. */
function isAuthEndpoint(url: string): boolean {
  return AUTH_PATHS.some((path) => url.includes(path));
}

/**
 * Functional HTTP interceptor that:
 * 1. Attaches the Bearer token from session to every outgoing request.
 * 2. On 401: if the request targets an auth endpoint → clears session + redirects.
 *    Otherwise attempts a token refresh (once) and retries the original request.
 * 3. Queues concurrent 401 requests so the refresh is only called once.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const refreshUseCase = inject(RefreshUseCase);
  const router = inject(Router);

  const token = session.getAccessToken();
  const authedReq = token ? addAuthHeader(req, token) : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== HttpStatusCode.Unauthorized
      ) {
        return throwError(() => error);
      }

      // Auth endpoints must not be retried — just clear + redirect
      if (isAuthEndpoint(req.url)) {
        void router.navigate(['/login']);
        return throwError(() => error);
      }

      return handle401(req, next, session, refreshUseCase, router);
    }),
  );
};

function handle401(
  req: Parameters<HttpInterceptorFn>[0],
  next: Parameters<HttpInterceptorFn>[1],
  session: SessionService,
  refreshUseCase: RefreshUseCase,
  router: Router,
) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshToken$.next(null);

    return refreshUseCase.execute().pipe(
      switchMap((tokens: AuthTokens) => {
        isRefreshing = false;
        refreshToken$.next(tokens.accessToken);
        return next(addAuthHeader(req, tokens.accessToken));
      }),
      catchError((err: unknown) => {
        isRefreshing = false;
        refreshToken$.next(null);
        session.clearSession();
        void router.navigate(['/login']);
        return throwError(() => err);
      }),
    );
  }

  // Another refresh is already in flight — queue this request
  return refreshToken$.pipe(
    filter((t): t is string => t !== null),
    take(1),
    switchMap((newToken) => next(addAuthHeader(req, newToken))),
  );
}
