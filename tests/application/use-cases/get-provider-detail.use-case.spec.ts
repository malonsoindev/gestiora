import { describe, expect, it } from 'vitest';
import { GetProviderDetailUseCase } from '@application/use-cases/get-provider-detail.use-case.js';
import type { ProviderRepository } from '@application/ports/provider.repository.js';
import type { PortError } from '@application/errors/port.error.js';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';
import { ok, type Result } from '@shared/result.js';
import { ProviderNotFoundError } from '@domain/errors/provider-not-found.error.js';
import { createTestProvider } from '@tests/shared/fixtures/provider.fixture.js';

const fixedNow = new Date('2026-02-04T12:00:00.000Z');

class ProviderRepositoryStub implements ProviderRepository {
    constructor(private readonly provider: Provider | null) {}

    async create(): Promise<Result<void, PortError>> {
        return ok(undefined);
    }

    async update(): Promise<Result<void, PortError>> {
        return ok(undefined);
    }

    async findById(): Promise<Result<Provider | null, PortError>> {
        return ok(this.provider);
    }

    async list(): Promise<Result<{ items: Provider[]; total: number }, PortError>> {
        return ok({ items: [], total: 0 });
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

describe('GetProviderDetailUseCase', () => {
    it('returns provider detail when found', async () => {
        const repository = new ProviderRepositoryStub(createProvider());
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
        const repository = new ProviderRepositoryStub(null);
        const useCase = new GetProviderDetailUseCase({ providerRepository: repository });

        const result = await useCase.execute({ providerId: 'missing' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderNotFoundError);
        }
    });
});
