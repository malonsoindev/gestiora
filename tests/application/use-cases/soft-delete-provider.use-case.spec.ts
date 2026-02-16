import { describe, expect, it } from 'vitest';
import { SoftDeleteProviderUseCase } from '@application/use-cases/soft-delete-provider.use-case.js';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import type { ProviderProps } from '@domain/entities/provider.entity.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';
import { ProviderNotFoundError } from '@domain/errors/provider-not-found.error.js';
import { RagReindexProviderInvoicesServiceStub } from '@tests/application/stubs/rag-reindex-provider-invoices.service.stub.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import { ProviderRepositorySpy } from '@tests/shared/spies/provider-repository.spy.js';
import { fixedNow } from '@tests/shared/fixed-now.js';
import { createTestProvider } from '@tests/shared/fixtures/provider.fixture.js';

const createProvider = (overrides: Partial<ProviderProps> = {}): Provider =>
    createTestProvider({
        now: fixedNow,
        overrides: {
            status: ProviderStatus.Active,
            cif: Cif.create('B12345678'),
            ...overrides,
        },
    });

type SutOverrides = Partial<{
    provider: Provider | null;
    now: Date;
}>;

const makeSut = (overrides: SutOverrides = {}) => {
    const now = overrides.now ?? fixedNow;
    const provider = overrides.provider === undefined ? createProvider() : overrides.provider;
    const providerRepository = new ProviderRepositorySpy({ existingProvider: provider });
    const auditLogger = new AuditLoggerSpy();

    const useCase = new SoftDeleteProviderUseCase({
        providerRepository,
        auditLogger,
        dateProvider: new DateProviderStub(now),
        ragReindexProviderInvoicesService: new RagReindexProviderInvoicesServiceStub(),
    });

    return { useCase, providerRepository, auditLogger };
};

const baseCommand = {
    actorUserId: 'user-1',
    providerId: 'provider-1',
};

describe('SoftDeleteProviderUseCase', () => {
    it('soft deletes provider and audits the action', async () => {
        const { useCase, providerRepository, auditLogger } = makeSut();

        const result = await useCase.execute(baseCommand);

        expect(result.success).toBe(true);
        expect(providerRepository.updatedProvider?.status).toBe(ProviderStatus.Deleted);
        expect(providerRepository.updatedProvider?.deletedAt).toBe(fixedNow);
        expect(auditLogger.events.some((event) => event.action === 'PROVIDER_DELETED')).toBe(true);
    });

    it('rejects when provider does not exist', async () => {
        const { useCase, providerRepository } = makeSut({ provider: null });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            providerId: 'missing',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderNotFoundError);
        }
        expect(providerRepository.updatedProvider).toBeNull();
    });

    it('rejects when provider is already deleted', async () => {
        const { useCase, providerRepository } = makeSut({
            provider: createProvider({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
        });

        const result = await useCase.execute(baseCommand);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderNotFoundError);
        }
        expect(providerRepository.updatedProvider).toBeNull();
    });
});
