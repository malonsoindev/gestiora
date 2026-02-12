import { ok, type Result } from '@shared/result.js';
import { PortError } from '@application/errors/port.error.js';
import type {
    ProviderListFilters,
    ProviderListResult,
    ProviderRepository,
} from '@application/ports/provider.repository.js';
import type { Provider } from '@domain/entities/provider.entity.js';

export class InMemoryProviderRepository implements ProviderRepository {
    private readonly providersById = new Map<string, Provider>();

    constructor(initialProviders: Provider[] = []) {
        initialProviders.forEach((provider) => this.add(provider));
    }

    add(provider: Provider): void {
        this.providersById.set(provider.id, provider);
    }

    async create(provider: Provider): Promise<Result<void, PortError>> {
        this.add(provider);
        return ok(undefined);
    }

    async update(provider: Provider): Promise<Result<void, PortError>> {
        this.providersById.set(provider.id, provider);
        return ok(undefined);
    }

    async findById(providerId: string): Promise<Result<Provider | null, PortError>> {
        return ok(this.providersById.get(providerId) ?? null);
    }

    async list(filters: ProviderListFilters): Promise<Result<ProviderListResult, PortError>> {
        const allProviders = Array.from(this.providersById.values());
        const filtered = allProviders.filter((provider) => {
            if (filters.status !== undefined) {
                if (provider.status !== filters.status) {
                    return false;
                }
            } else if (provider.deletedAt) {
                return false;
            }
            if (filters.q) {
                const normalizedQuery = normalizeText(filters.q);
                const normalizedRazon = normalizeText(provider.razonSocial);
                if (!normalizedRazon.includes(normalizedQuery)) {
                    return false;
                }
            }
            return true;
        });

        const total = filtered.length;
        const start = (filters.page - 1) * filters.pageSize;
        const items = filtered.slice(start, start + filters.pageSize);

        return ok({ items, total });
    }

    async findByCif(cif: string): Promise<Result<Provider | null, PortError>> {
        const match = Array.from(this.providersById.values()).find(
            (provider) => provider.cif === cif && !provider.deletedAt,
        );
        return ok(match ?? null);
    }

    async findByRazonSocialNormalized(normalized: string): Promise<Result<Provider | null, PortError>> {
        const match = Array.from(this.providersById.values()).find((provider) => {
            if (provider.deletedAt) {
                return false;
            }
            return normalizeText(provider.razonSocial) === normalized;
        });
        return ok(match ?? null);
    }
}

const normalizeText = (value: string): string => value.trim().toLowerCase().replaceAll(/\s+/g, ' ');
