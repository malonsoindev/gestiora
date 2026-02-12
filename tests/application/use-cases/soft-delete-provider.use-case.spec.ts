import { describe, expect, it } from 'vitest';
import { SoftDeleteProviderUseCase } from '../../../src/application/use-cases/soft-delete-provider.use-case.js';
import { Provider, ProviderStatus } from '../../../src/domain/entities/provider.entity.js';
import type { ProviderProps } from '../../../src/domain/entities/provider.entity.js';
import { Cif } from '../../../src/domain/value-objects/cif.value-object.js';
import { ProviderNotFoundError } from '../../../src/domain/errors/provider-not-found.error.js';
import { RagReindexProviderInvoicesServiceStub } from '../stubs/rag-reindex-provider-invoices.service.stub.js';
import { DateProviderStub } from '../../shared/stubs/date-provider.stub.js';
import { AuditLoggerSpy } from '../../shared/spies/audit-logger.spy.js';
import { ProviderRepositorySpy } from '../../shared/spies/provider-repository.spy.js';
import { fixedNow } from '../../shared/fixed-now.js';

const createProvider = (overrides: Partial<ProviderProps> = {}): Provider =>
    Provider.create({
        id: 'provider-1',
        razonSocial: 'Proveedor Uno',
        cif: Cif.create('B12345678'),
        direccion: 'Calle Falsa 123',
        poblacion: 'Madrid',
        provincia: 'Madrid',
        pais: 'ES',
        status: ProviderStatus.Active,
        createdAt: fixedNow,
        updatedAt: fixedNow,
        ...overrides,
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
