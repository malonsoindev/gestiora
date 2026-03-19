import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AUTH_PORT } from './auth.tokens';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class LogoutUseCase {
  private readonly authPort = inject(AUTH_PORT);
  private readonly session = inject(SessionService);

  execute(): Observable<void> {
    const refreshToken = this.session.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    return this.authPort.logout(refreshToken).pipe(
      tap(() => this.session.clearSession()),
    );
  }
}
