import { ProviderStatus, ProviderSummary } from './provider.model';

export interface ProviderListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: ProviderStatus;
}

export interface ProviderListResponse {
  items: ProviderSummary[];
  page?: number;
  pageSize?: number;
  total?: number;
}
