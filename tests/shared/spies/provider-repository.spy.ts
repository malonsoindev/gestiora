import type { ProviderRepository, ProviderListFilters, ProviderListResult } from '@application/ports/provider.repository.js';
import type { PortError } from '@application/errors/port.error.js';
import type { Provider } from '@domain/entities/provider.entity.js';
import { ok } from '@shared/result.js';

export type ProviderRepositorySpyOptions = {
    existingProvider?: Provider | null;
    duplicateByCif?: Provider | null;
    duplicateByRazon?: Provider | null;
};

export class ProviderRepositorySpy implements ProviderRepository {
    updatedProvider: Provider | null = null;
    private readonly existingProvider: Provider | null;
    private readonly duplicateByCif: Provider | null;
    private readonly duplicateByRazon: Provider | null;

    constructor(options: ProviderRepositorySpyOptions = {}) {
        this.existingProvider = options.existingProvider ?? null;
        this.duplicateByCif = options.duplicateByCif ?? null;
        this.duplicateByRazon = options.duplicateByRazon ?? null;
    }

    async findById(_providerId: string) {
        return ok(this.existingProvider);
    }

    async list(_filters: ProviderListFilters): Promise<
        { success: true; value: ProviderListResult } | { success: false; error: PortError }
    > {
        return ok({ items: [], total: 0 });
    }

    async create(_provider: Provider) {
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
