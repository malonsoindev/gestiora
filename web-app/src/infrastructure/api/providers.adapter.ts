import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IProvidersPort } from '../../core/domain/providers/providers.port';
import {
  CreateProviderRequest,
  ProviderDetail,
  UpdateProviderRequest,
  UpdateProviderStatusRequest,
} from '../../core/domain/providers/provider.model';
import {
  ProviderListParams,
  ProviderListResponse,
} from '../../core/domain/providers/provider-list-params.model';

@Injectable()
export class ProvidersAdapter implements IProvidersPort {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/providers';

  getProviders(params: ProviderListParams): Observable<ProviderListResponse> {
    let httpParams = new HttpParams();

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.pageSize !== undefined) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }
    if (params.q !== undefined) {
      httpParams = httpParams.set('q', params.q);
    }
    if (params.status !== undefined) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<ProviderListResponse>(this.baseUrl, { params: httpParams });
  }

  getProvider(providerId: string): Observable<ProviderDetail> {
    return this.http.get<ProviderDetail>(`${this.baseUrl}/${providerId}`);
  }

  createProvider(request: CreateProviderRequest): Observable<{ providerId: string }> {
    return this.http.post<{ providerId: string }>(this.baseUrl, request);
  }

  updateProvider(
    providerId: string,
    request: UpdateProviderRequest,
  ): Observable<ProviderDetail> {
    return this.http.put<ProviderDetail>(`${this.baseUrl}/${providerId}`, request);
  }

  deleteProvider(providerId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${providerId}`);
  }

  updateProviderStatus(
    providerId: string,
    request: UpdateProviderStatusRequest,
  ): Observable<ProviderDetail> {
    return this.http.patch<ProviderDetail>(
      `${this.baseUrl}/${providerId}/status`,
      request,
    );
  }
}
