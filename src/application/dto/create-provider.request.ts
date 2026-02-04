import type { ProviderStatus } from '../../domain/entities/provider.entity.js';

export type CreateProviderRequest = {
    actorUserId: string;
    razonSocial: string;
    cif?: string;
    direccion?: string;
    poblacion?: string;
    provincia?: string;
    pais?: string;
    status?: ProviderStatus;
};
