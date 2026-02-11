import { describe, expect, it } from 'vitest';
import { SoftDeleteProviderUseCase } from '../../../src/application/use-cases/soft-delete-provider.use-case.js';
import type { AuditEvent, AuditLogger } from '../../../src/application/ports/audit-logger.js';
import type { DateProvider } from '../../../src/application/ports/date-provider.js';
import type { ProviderRepository } from '../../../src/application/ports/provider.repository.js';
import type { PortError } from '../../../src/application/errors/port.error.js';
import { Provider, ProviderStatus } from '../../../src/domain/entities/provider.entity.js';
import type { ProviderProps } from '../../../src/domain/entities/provider.entity.js';
import { Cif } from '../../../src/domain/value-objects/cif.value-object.js';
import { ProviderNotFoundError } from '../../../src/domain/errors/provider-not-found.error.js';
import { ok, type Result } from '../../../src/shared/result.js';
import { RagReindexProviderInvoicesServiceStub } from '../stubs/rag-reindex-provider-invoices.service.stub.js';

const fixedNow = new Date('2026-02-07T10:00:00.000Z');

class DateProviderStub implements DateProvider {
    now(): Result<Date, PortError> {
        return ok(fixedNow);
    }
}

class AuditLoggerSpy implements AuditLogger {
    events: AuditEvent[] = [];

    async log(event: AuditEvent) {
        this.events.push(event);
        return ok(undefined);
    }
}

class ProviderRepositorySpy implements ProviderRepository {
    updatedProvider: Provider | null = null;
    private readonly existingProvider: Provider | null;

    constructor(existingProvider: Provider | null) {
        this.existingProvider = existingProvider;
    }

    async findById(): Promise<Result<Provider | null, PortError>> {
        return ok(this.existingProvider);
    }

    async create(): Promise<Result<void, PortError>> {
        return ok(undefined);
    }

    async update(provider: Provider): Promise<Result<void, PortError>> {
        this.updatedProvider = provider;
        return ok(undefined);
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

describe('SoftDeleteProviderUseCase', () => {
    it('soft deletes provider and audits the action', async () => {
        const providerRepository = new ProviderRepositorySpy(createProvider());
        const auditLogger = new AuditLoggerSpy();

        const useCase = new SoftDeleteProviderUseCase({
            providerRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
            ragReindexProviderInvoicesService: new RagReindexProviderInvoicesServiceStub(),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            providerId: 'provider-1',
        });

        expect(result.success).toBe(true);
        expect(providerRepository.updatedProvider?.status).toBe(ProviderStatus.Deleted);
        expect(providerRepository.updatedProvider?.deletedAt).toBe(fixedNow);
        expect(auditLogger.events.some((event) => event.action === 'PROVIDER_DELETED')).toBe(true);
    });

    it('rejects when provider does not exist', async () => {
        const providerRepository = new ProviderRepositorySpy(null);
        const auditLogger = new AuditLoggerSpy();

        const useCase = new SoftDeleteProviderUseCase({
            providerRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
            ragReindexProviderInvoicesService: new RagReindexProviderInvoicesServiceStub(),
        });

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
        const providerRepository = new ProviderRepositorySpy(
            createProvider({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
        );
        const auditLogger = new AuditLoggerSpy();

        const useCase = new SoftDeleteProviderUseCase({
            providerRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
            ragReindexProviderInvoicesService: new RagReindexProviderInvoicesServiceStub(),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            providerId: 'provider-1',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderNotFoundError);
        }
        expect(providerRepository.updatedProvider).toBeNull();
    });
});
