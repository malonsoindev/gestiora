import { InjectionToken } from '@angular/core';
import { IAuthPort } from '../../domain/auth/auth.port';

export const AUTH_PORT = new InjectionToken<IAuthPort>('AUTH_PORT');
