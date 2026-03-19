import { Observable } from 'rxjs';
import { LoginCredentials } from './login-credentials.model';
import { AuthTokens } from './auth-tokens.model';

export interface IAuthPort {
  login(credentials: LoginCredentials): Observable<AuthTokens>;
  refresh(refreshToken: string): Observable<AuthTokens>;
  logout(refreshToken: string): Observable<void>;
}
