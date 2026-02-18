import { describe, expect, it } from 'vitest';
import { GetProviderDetailUseCase } from '@application/use-cases/get-provider-detail.use-case.js';
import type { Provider } from '@domain/entities/provider.entity.js';
import { ProviderStatus } from '@domain/entities/provider.entity.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';
import { ProviderNotFoundError } from '@domain/errors/provider-not-found.error.js';
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

describe('GetProviderDetailUseCase', () => {
    it('returns provider detail when found', async () => {
        const repository = new ProviderRepositorySpy({ existingProvider: createProvider() });
        const useCase = new GetProviderDetailUseCase({ providerRepository: repository });

        const result = await useCase.execute({ providerId: 'provider-1' });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.providerId).toBe('provider-1');
            expect(result.value.razonSocial).toBe('Proveedor Uno');
            expect(result.value.status).toBe(ProviderStatus.Active);
        }
    });

    it('rejects when provider does not exist', async () => {
        const repository = new ProviderRepositorySpy({ existingProvider: null });
        const useCase = new GetProviderDetailUseCase({ providerRepository: repository });

        const result = await useCase.execute({ providerId: 'missing' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderNotFoundError);
        }
    });
});
