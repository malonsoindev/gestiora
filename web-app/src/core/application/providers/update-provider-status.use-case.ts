import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PROVIDERS_PORT } from './providers.tokens';
import { ProviderDetail, UpdateProviderStatusRequest } from '../../domain/providers/provider.model';

@Injectable({ providedIn: 'root' })
export class UpdateProviderStatusUseCase {
  private readonly providersPort = inject(PROVIDERS_PORT);

  execute(providerId: string, request: UpdateProviderStatusRequest): Observable<ProviderDetail> {
    return this.providersPort.updateProviderStatus(providerId, request);
  }
}
