import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AUTH_PORT } from './auth.tokens';
import { SessionService } from './session.service';
import { AuthTokens } from '../../domain/auth/auth-tokens.model';

@Injectable({ providedIn: 'root' })
export class RefreshUseCase {
  private readonly authPort = inject(AUTH_PORT);
  private readonly session = inject(SessionService);

  execute(): Observable<AuthTokens> {
    const refreshToken = this.session.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    return this.authPort.refresh(refreshToken).pipe(
      tap((tokens) => this.session.saveTokens(tokens)),
    );
  }
}
