import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PROVIDERS_PORT } from './providers.tokens';
import { ProviderListParams, ProviderListResponse } from '../../domain/providers/provider-list-params.model';

@Injectable({ providedIn: 'root' })
export class GetProvidersUseCase {
  private readonly providersPort = inject(PROVIDERS_PORT);

  execute(params: ProviderListParams): Observable<ProviderListResponse> {
    return this.providersPort.getProviders(params);
  }
}
