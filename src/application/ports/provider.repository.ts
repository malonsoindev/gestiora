import type { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import type { Result } from '@shared/result.js';
import type { PortError } from '@application/errors/port.error.js';

export type ProviderListResult = {
    items: Provider[];
    total: number;
};

export type ProviderListFilters = {
    status?: ProviderStatus;
    q?: string;
    page: number;
    pageSize: number;
};

export interface ProviderRepository {
    create(provider: Provider): Promise<Result<void, PortError>>;
    update(provider: Provider): Promise<Result<void, PortError>>;
    findById(providerId: string): Promise<Result<Provider | null, PortError>>;
    list(filters: ProviderListFilters): Promise<Result<ProviderListResult, PortError>>;
    findByCif(cif: string): Promise<Result<Provider | null, PortError>>;
    findByRazonSocialNormalized(normalized: string): Promise<Result<Provider | null, PortError>>;
}
