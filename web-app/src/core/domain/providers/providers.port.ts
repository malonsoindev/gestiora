import { Observable } from 'rxjs';
import {
  CreateProviderRequest,
  ProviderDetail,
  UpdateProviderRequest,
  UpdateProviderStatusRequest,
} from './provider.model';
import { ProviderListParams, ProviderListResponse } from './provider-list-params.model';

export interface IProvidersPort {
  getProviders(params: ProviderListParams): Observable<ProviderListResponse>;
  getProvider(providerId: string): Observable<ProviderDetail>;
  createProvider(request: CreateProviderRequest): Observable<{ providerId: string }>;
  updateProvider(providerId: string, request: UpdateProviderRequest): Observable<ProviderDetail>;
  deleteProvider(providerId: string): Observable<void>;
  updateProviderStatus(
    providerId: string,
    request: UpdateProviderStatusRequest,
  ): Observable<ProviderDetail>;
}
