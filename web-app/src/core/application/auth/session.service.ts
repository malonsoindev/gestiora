import { Injectable } from '@angular/core';
import { AuthTokens } from '../../domain/auth/auth-tokens.model';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const ACCESS_TOKEN_EXPIRY_KEY = 'accessTokenExpiry';

@Injectable({ providedIn: 'root' })
export class SessionService {
  saveTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    const expiryMs = Date.now() + tokens.expiresIn * 1000;
    localStorage.setItem(ACCESS_TOKEN_EXPIRY_KEY, String(expiryMs));
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  isAccessTokenExpired(): boolean {
    const expiry = localStorage.getItem(ACCESS_TOKEN_EXPIRY_KEY);
    if (!expiry) return true;
    return Date.now() >= Number(expiry);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !this.isAccessTokenExpired();
  }

  clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_EXPIRY_KEY);
  }
}
