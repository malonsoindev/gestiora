import type { ProviderRepository } from '../../../src/application/ports/provider.repository.js';
import type { Provider, ProviderStatus } from '../../../src/domain/entities/provider.entity.js';
import { ok } from '../../../src/shared/result.js';

export class ProviderRepositoryStub implements ProviderRepository {
    lastCif: string | null = null;

    constructor(private readonly provider: Provider | null) {}

    async findById(_providerId: string) {
        return ok(this.provider);
    }

    async list(_filters: { status?: ProviderStatus; q?: string; page: number; pageSize: number }) {
        return ok({ items: [], total: 0 });
    }

    async create(_provider: Provider) {
        return ok(undefined);
    }

    async update(_provider: Provider) {
        return ok(undefined);
    }

    async findByCif(cif: string) {
        this.lastCif = cif;
        return ok(this.provider);
    }

    async findByRazonSocialNormalized(_normalized: string) {
        return ok(null);
    }
}
