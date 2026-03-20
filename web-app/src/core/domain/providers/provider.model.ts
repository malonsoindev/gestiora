export type ProviderStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED' | 'DRAFT';

export interface ProviderSummary {
  providerId: string;
  razonSocial: string;
  status: ProviderStatus;
}

export interface ProviderDetail extends ProviderSummary {
  cif?: string;
  direccion?: string;
  poblacion?: string;
  provincia?: string;
  pais?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateProviderRequest {
  razonSocial: string;
  cif?: string;
  direccion?: string;
  poblacion?: string;
  provincia?: string;
  pais?: string;
  status?: ProviderStatus;
}

export interface UpdateProviderRequest {
  razonSocial?: string;
  cif?: string;
  direccion?: string;
  poblacion?: string;
  provincia?: string;
  pais?: string;
}

export interface UpdateProviderStatusRequest {
  status: ProviderStatus;
}
