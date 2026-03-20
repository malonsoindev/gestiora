import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PROVIDERS_PORT } from './providers.tokens';
import { ProviderDetail, UpdateProviderRequest } from '../../domain/providers/provider.model';

@Injectable({ providedIn: 'root' })
export class UpdateProviderUseCase {
  private readonly providersPort = inject(PROVIDERS_PORT);

  execute(providerId: string, request: UpdateProviderRequest): Observable<ProviderDetail> {
    return this.providersPort.updateProvider(providerId, request);
  }
}
