import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AUTH_PORT } from './auth.tokens';
import { SessionService } from './session.service';
import { LoginCredentials } from '../../domain/auth/login-credentials.model';
import { AuthTokens } from '../../domain/auth/auth-tokens.model';

@Injectable({ providedIn: 'root' })
export class LoginUseCase {
  private readonly authPort = inject(AUTH_PORT);
  private readonly session = inject(SessionService);

  execute(credentials: LoginCredentials): Observable<AuthTokens> {
    return this.authPort.login(credentials).pipe(
      tap((tokens) => this.session.saveTokens(tokens)),
    );
  }
}
