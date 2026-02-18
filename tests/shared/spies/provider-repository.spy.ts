import type { ProviderRepository, ProviderListFilters, ProviderListResult } from '@application/ports/provider.repository.js';
import type { PortError } from '@application/errors/port.error.js';
import type { Provider } from '@domain/entities/provider.entity.js';
import { ok } from '@shared/result.js';

export type ProviderRepositorySpyOptions = {
    existingProvider?: Provider | null;
    duplicateByCif?: Provider | null;
    duplicateByRazon?: Provider | null;
    providers?: Provider[];
};

export class ProviderRepositorySpy implements ProviderRepository {
    createdProvider: Provider | null = null;
    updatedProvider: Provider | null = null;
    private readonly existingProvider: Provider | null;
    private readonly duplicateByCif: Provider | null;
    private readonly duplicateByRazon: Provider | null;
    private readonly providers: Provider[];

    constructor(options: ProviderRepositorySpyOptions = {}) {
        this.existingProvider = options.existingProvider ?? null;
        this.duplicateByCif = options.duplicateByCif ?? null;
        this.duplicateByRazon = options.duplicateByRazon ?? null;
        this.providers = options.providers ?? [];
    }

    async findById(_providerId: string) {
        return ok(this.existingProvider);
    }

    async list(filters: ProviderListFilters): Promise<
        { success: true; value: ProviderListResult } | { success: false; error: PortError }
    > {
        const items = this.providers.filter((provider) => {
            if (filters.status && provider.status !== filters.status) {
                return false;
            }
            if (filters.q && !provider.razonSocial.toLowerCase().includes(filters.q.toLowerCase())) {
                return false;
            }
            return true;
        });
        return ok({ items, total: items.length });
    }

    async create(provider: Provider) {
        this.createdProvider = provider;
        return ok(undefined);
    }

    async update(provider: Provider) {
        this.updatedProvider = provider;
        return ok(undefined);
    }

    async findByCif(_cif: string) {
        return ok(this.duplicateByCif);
    }

    async findByRazonSocialNormalized(_normalized: string) {
        return ok(this.duplicateByRazon);
    }
}
