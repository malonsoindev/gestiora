import { describe, expect, it } from 'vitest';
import { ListProvidersUseCase } from '@application/use-cases/list-providers.use-case.js';
import type { Provider } from '@domain/entities/provider.entity.js';
import { ProviderStatus } from '@domain/entities/provider.entity.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';
import { createTestProvider } from '@tests/shared/fixtures/provider.fixture.js';
import { ProviderRepositorySpy } from '@tests/shared/spies/provider-repository.spy.js';
import { fixedNow } from '@tests/shared/fixed-now.js';

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
        const repository = new ProviderRepositorySpy({
            providers: [
                createProvider({ id: 'provider-1', razonSocial: 'Proveedor Uno' }),
                createProvider({ id: 'provider-2', razonSocial: 'Proveedor Dos' }),
            ],
        });

        const useCase = new ListProvidersUseCase({ providerRepository: repository });

        const result = await useCase.execute({ page: 1, pageSize: 20 });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.items).toHaveLength(2);
            expect(result.value.total).toBe(2);
        }
    });

    it('filters by status and text query', async () => {
        const repository = new ProviderRepositorySpy({
            providers: [
                createProvider({ id: 'provider-1', razonSocial: 'Proveedor Uno', status: ProviderStatus.Active }),
                createProvider({ id: 'provider-2', razonSocial: 'Proveedor Dos', status: ProviderStatus.Inactive }),
            ],
        });

        const useCase = new ListProvidersUseCase({ providerRepository: repository });

        const result = await useCase.execute({ page: 1, pageSize: 20, status: ProviderStatus.Inactive, q: 'Dos' });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.items).toHaveLength(1);
            expect(result.value.items[0]?.razonSocial).toBe('Proveedor Dos');
        }
    });
});
