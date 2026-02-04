import type { ProviderStatus } from '../../domain/entities/provider.entity.js';

export type ProviderSummary = {
    providerId: string;
    razonSocial: string;
    status: ProviderStatus;
};

export type ProviderListResponse = {
    items: ProviderSummary[];
    page: number;
    pageSize: number;
    total: number;
};
