import { InjectionToken } from '@angular/core';
import { IProvidersPort } from '../../domain/providers/providers.port';

export const PROVIDERS_PORT = new InjectionToken<IProvidersPort>('PROVIDERS_PORT');
