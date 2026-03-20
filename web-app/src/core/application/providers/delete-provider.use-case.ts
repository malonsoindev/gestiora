import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PROVIDERS_PORT } from './providers.tokens';

@Injectable({ providedIn: 'root' })
export class DeleteProviderUseCase {
  private readonly providersPort = inject(PROVIDERS_PORT);

  execute(providerId: string): Observable<void> {
    return this.providersPort.deleteProvider(providerId);
  }
}
