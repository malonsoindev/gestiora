import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PROVIDERS_PORT } from './providers.tokens';
import { CreateProviderRequest } from '../../domain/providers/provider.model';

@Injectable({ providedIn: 'root' })
export class CreateProviderUseCase {
  private readonly providersPort = inject(PROVIDERS_PORT);

  execute(request: CreateProviderRequest): Observable<{ providerId: string }> {
    return this.providersPort.createProvider(request);
  }
}
