import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IAuthPort } from '../../core/domain/auth/auth.port';
import { LoginCredentials } from '../../core/domain/auth/login-credentials.model';
import { AuthTokens } from '../../core/domain/auth/auth-tokens.model';

@Injectable()
export class AuthAdapter implements IAuthPort {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  login(credentials: LoginCredentials): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.baseUrl}/auth/login`, credentials);
  }

  refresh(refreshToken: string): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(
      `${this.baseUrl}/auth/refresh`,
      { refreshToken },
    );
  }

  logout(refreshToken: string): Observable<void> {
    const accessToken = localStorage.getItem('accessToken');
    const headers = accessToken
      ? new HttpHeaders({ Authorization: `Bearer ${accessToken}` })
      : undefined;
    return this.http.post<void>(
      `${this.baseUrl}/auth/logout`,
      { refreshToken },
      headers ? { headers } : {},
    );
  }
}
