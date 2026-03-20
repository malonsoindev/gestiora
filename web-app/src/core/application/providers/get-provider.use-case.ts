import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PROVIDERS_PORT } from './providers.tokens';
import { ProviderDetail } from '../../domain/providers/provider.model';

@Injectable({ providedIn: 'root' })
export class GetProviderUseCase {
  private readonly providersPort = inject(PROVIDERS_PORT);

  execute(providerId: string): Observable<ProviderDetail> {
    return this.providersPort.getProvider(providerId);
  }
}
