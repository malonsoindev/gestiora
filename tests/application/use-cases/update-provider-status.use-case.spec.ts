import { describe, expect, it } from 'vitest';
import { UpdateProviderStatusUseCase } from '@application/use-cases/update-provider-status.use-case.js';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import { ProviderNotFoundError } from '@domain/errors/provider-not-found.error.js';
import { InvalidProviderStatusError } from '@domain/errors/invalid-provider-status.error.js';
import { RagReindexProviderInvoicesServiceStub } from '@tests/shared/stubs/rag-reindex-provider-invoices.service.stub.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import { ProviderRepositorySpy } from '@tests/shared/spies/provider-repository.spy.js';
import { fixedNow } from '@tests/shared/fixed-now.js';
import { createActiveProvider } from '@tests/shared/fixtures/provider.fixture.js';

type SutOverrides = Partial<{
    provider: Provider | null;
    now: Date;
}>;

const makeSut = (overrides: SutOverrides = {}) => {
    const now = overrides.now ?? fixedNow;
    const provider = overrides.provider === undefined ? createActiveProvider() : overrides.provider;
    const providerRepository = new ProviderRepositorySpy({ existingProvider: provider });
    const auditLogger = new AuditLoggerSpy();

    const useCase = new UpdateProviderStatusUseCase({
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

describe('UpdateProviderStatusUseCase', () => {
    it('updates provider status to inactive and audits the action', async () => {
        const { useCase, providerRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            ...baseCommand,
            status: ProviderStatus.Inactive,
        });

        expect(result.success).toBe(true);
        expect(providerRepository.updatedProvider?.status).toBe(ProviderStatus.Inactive);
        expect(providerRepository.updatedProvider?.updatedAt).toBe(fixedNow);
        expect(auditLogger.events.some((event) => event.action === 'PROVIDER_DEACTIVATED')).toBe(true);
    });

    it('updates provider status to active and audits the action', async () => {
        const { useCase, providerRepository, auditLogger } = makeSut({
            provider: createActiveProvider({ status: ProviderStatus.Inactive }),
        });

        const result = await useCase.execute({
            ...baseCommand,
            status: ProviderStatus.Active,
        });

        expect(result.success).toBe(true);
        expect(providerRepository.updatedProvider?.status).toBe(ProviderStatus.Active);
        expect(providerRepository.updatedProvider?.updatedAt).toBe(fixedNow);
        expect(auditLogger.events.some((event) => event.action === 'PROVIDER_ACTIVATED')).toBe(true);
    });

    it('rejects when provider does not exist', async () => {
        const { useCase, providerRepository } = makeSut({ provider: null });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            providerId: 'missing',
            status: ProviderStatus.Active,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderNotFoundError);
        }
        expect(providerRepository.updatedProvider).toBeNull();
    });

    it('rejects when provider is deleted', async () => {
        const { useCase, providerRepository } = makeSut({
            provider: createActiveProvider({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
        });

        const result = await useCase.execute({
            ...baseCommand,
            status: ProviderStatus.Active,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderNotFoundError);
        }
        expect(providerRepository.updatedProvider).toBeNull();
    });

    it('rejects invalid status transitions to deleted', async () => {
        const { useCase, providerRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            ...baseCommand,
            status: ProviderStatus.Deleted,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidProviderStatusError);
        }
        expect(providerRepository.updatedProvider).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });
});
