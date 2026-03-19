import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
// provideAnimations is deprecated since Angular 20.2 (intent to remove v23).
// The suggested replacement (animate.enter / animate.leave) is a compiler-level
// instruction for inline component animations, NOT a DI provider. Angular Material
// and CDK 21 still require ANIMATION_MODULE_TYPE to be registered, which only
// provideAnimations() / provideNoopAnimations() do. Keep until Material migrates.
// NOSONAR S1874
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { AUTH_PORT } from '../core/application/auth/auth.tokens';
import { AuthAdapter } from '../infrastructure/api/auth.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideAnimations(),
    { provide: AUTH_PORT, useClass: AuthAdapter },
  ],
};
