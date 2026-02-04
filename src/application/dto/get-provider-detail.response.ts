import type { ProviderStatus } from '../../domain/entities/provider.entity.js';

export type ProviderDetailResponse = {
    providerId: string;
    razonSocial: string;
    cif?: string;
    direccion?: string;
    poblacion?: string;
    provincia?: string;
    pais?: string;
    status: ProviderStatus;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
};
