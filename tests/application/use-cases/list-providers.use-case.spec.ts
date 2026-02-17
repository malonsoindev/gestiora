import { describe, expect, it } from 'vitest';
import { ListProvidersUseCase } from '@application/use-cases/list-providers.use-case.js';
import type { ProviderRepository } from '@application/ports/provider.repository.js';
import type { PortError } from '@application/errors/port.error.js';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';
import { ok, type Result } from '@shared/result.js';
import { createTestProvider } from '@tests/shared/fixtures/provider.fixture.js';

const fixedNow = new Date('2026-02-04T10:00:00.000Z');

class ProviderRepositoryStub implements ProviderRepository {
    constructor(private readonly providers: Provider[]) {}

    async create(): Promise<Result<void, PortError>> {
        return ok(undefined);
    }

    async update(): Promise<Result<void, PortError>> {
        return ok(undefined);
    }

    async findById(): Promise<Result<Provider | null, PortError>> {
        return ok(null);
    }

    async list(filters: { status?: ProviderStatus; q?: string; page: number; pageSize: number }): Promise<Result<{ items: Provider[]; total: number }, PortError>> {
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

    async findByCif(): Promise<Result<Provider | null, PortError>> {
        return ok(null);
    }

    async findByRazonSocialNormalized(): Promise<Result<Provider | null, PortError>> {
        return ok(null);
    }
}

const createProvider = (overrides: Partial<Provider> = {}): Provider =>
    createTestProvider({
        now: fixedNow,
        overrides: {
            status: ProviderStatus.Active,
            cif: Cif.create('B12345678'),
            ...(overrides as unknown as Record<string, unknown>),
        },
    });

describe('ListProvidersUseCase', () => {
    it('returns a paginated list of providers', async () => {
        const repository = new ProviderRepositoryStub([
            createProvider({ id: 'provider-1', razonSocial: 'Proveedor Uno' }),
            createProvider({ id: 'provider-2', razonSocial: 'Proveedor Dos' }),
        ]);

        const useCase = new ListProvidersUseCase({ providerRepository: repository });

        const result = await useCase.execute({ page: 1, pageSize: 20 });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.items).toHaveLength(2);
            expect(result.value.total).toBe(2);
        }
    });

    it('filters by status and text query', async () => {
        const repository = new ProviderRepositoryStub([
            createProvider({ id: 'provider-1', razonSocial: 'Proveedor Uno', status: ProviderStatus.Active }),
            createProvider({ id: 'provider-2', razonSocial: 'Proveedor Dos', status: ProviderStatus.Inactive }),
        ]);

        const useCase = new ListProvidersUseCase({ providerRepository: repository });

        const result = await useCase.execute({ page: 1, pageSize: 20, status: ProviderStatus.Inactive, q: 'Dos' });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.items).toHaveLength(1);
            expect(result.value.items[0]?.razonSocial).toBe('Proveedor Dos');
        }
    });
});
