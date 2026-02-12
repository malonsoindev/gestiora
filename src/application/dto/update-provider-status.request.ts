import type { ProviderStatus } from '@domain/entities/provider.entity.js';

export type UpdateProviderStatusRequest = {
    actorUserId: string;
    providerId: string;
    status: ProviderStatus;
};
