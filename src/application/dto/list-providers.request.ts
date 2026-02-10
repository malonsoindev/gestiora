import type { ProviderStatus } from '../../domain/entities/provider.entity.js';

export type ListProvidersRequest = {
    page: number;
    pageSize: number;
    status?: ProviderStatus;
    q?: string;
};
