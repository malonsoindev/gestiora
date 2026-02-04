import { describe, expect, it } from 'vitest';
import { UpdateProviderUseCase } from '../../../src/application/use-cases/update-provider.use-case.js';
import type { AuditEvent, AuditLogger } from '../../../src/application/ports/audit-logger.js';
import type { DateProvider } from '../../../src/application/ports/date-provider.js';
import type { ProviderRepository } from '../../../src/application/ports/provider.repository.js';
import type { PortError } from '../../../src/application/errors/port.error.js';
import { InvalidCifError } from '../../../src/domain/errors/invalid-cif.error.js';
import { ProviderAlreadyExistsError } from '../../../src/domain/errors/provider-already-exists.error.js';
import { ProviderNotFoundError } from '../../../src/domain/errors/provider-not-found.error.js';
import { Provider, ProviderStatus } from '../../../src/domain/entities/provider.entity.js';
import type { ProviderProps } from '../../../src/domain/entities/provider.entity.js';
import { Cif } from '../../../src/domain/value-objects/cif.value-object.js';
import { ok, type Result } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-02-05T10:00:00.000Z');

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
    private readonly duplicateByCif: Provider | null;
    private readonly duplicateByRazon: Provider | null;

    constructor(options: {
        existingProvider?: Provider | null;
        duplicateByCif?: Provider | null;
        duplicateByRazon?: Provider | null;
    } = {}) {
        this.existingProvider = options.existingProvider ?? null;
        this.duplicateByCif = options.duplicateByCif ?? null;
        this.duplicateByRazon = options.duplicateByRazon ?? null;
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
        return ok(this.duplicateByCif);
    }

    async findByRazonSocialNormalized(): Promise<Result<Provider | null, PortError>> {
        return ok(this.duplicateByRazon);
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

describe('UpdateProviderUseCase', () => {
    it('updates provider data and audits the action', async () => {
        const providerRepository = new ProviderRepositorySpy({ existingProvider: createProvider() });
        const auditLogger = new AuditLoggerSpy();

        const useCase = new UpdateProviderUseCase({
            providerRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            providerId: 'provider-1',
            razonSocial: 'Proveedor Actualizado',
            direccion: 'Avenida Nueva 1',
            poblacion: 'Sevilla',
            provincia: 'Sevilla',
            pais: 'ES',
        });

        expect(result.success).toBe(true);
        expect(providerRepository.updatedProvider).not.toBeNull();
        expect(providerRepository.updatedProvider?.razonSocial).toBe('Proveedor Actualizado');
        expect(providerRepository.updatedProvider?.direccion).toBe('Avenida Nueva 1');
        expect(providerRepository.updatedProvider?.updatedAt).toBe(fixedNow);
        expect(auditLogger.events.some((event) => event.action === 'PROVIDER_UPDATED')).toBe(true);
    });

    it('rejects when provider does not exist', async () => {
        const providerRepository = new ProviderRepositorySpy({ existingProvider: null });
        const auditLogger = new AuditLoggerSpy();

        const useCase = new UpdateProviderUseCase({
            providerRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            providerId: 'missing',
            razonSocial: 'Proveedor Actualizado',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderNotFoundError);
        }
        expect(providerRepository.updatedProvider).toBeNull();
    });

    it('rejects when provider is deleted', async () => {
        const providerRepository = new ProviderRepositorySpy({
            existingProvider: createProvider({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
        });
        const auditLogger = new AuditLoggerSpy();

        const useCase = new UpdateProviderUseCase({
            providerRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            providerId: 'provider-1',
            razonSocial: 'Proveedor Actualizado',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderNotFoundError);
        }
        expect(providerRepository.updatedProvider).toBeNull();
    });

    it('rejects invalid cif', async () => {
        const providerRepository = new ProviderRepositorySpy({ existingProvider: createProvider() });
        const auditLogger = new AuditLoggerSpy();

        const useCase = new UpdateProviderUseCase({
            providerRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            providerId: 'provider-1',
            cif: '12345678',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidCifError);
        }
        expect(providerRepository.updatedProvider).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects duplicate provider by cif when changing cif', async () => {
        const providerRepository = new ProviderRepositorySpy({
            existingProvider: createProvider(),
            duplicateByCif: createProvider({ id: 'provider-2', cif: Cif.create('A87654321') }),
        });
        const auditLogger = new AuditLoggerSpy();

        const useCase = new UpdateProviderUseCase({
            providerRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            providerId: 'provider-1',
            cif: 'A87654321',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderAlreadyExistsError);
        }
        expect(providerRepository.updatedProvider).toBeNull();
    });

    it('rejects duplicate provider by razonSocial when cif is missing and razonSocial changes', async () => {
        const providerWithoutCif = Provider.create({
            id: 'provider-1',
            razonSocial: 'Proveedor Uno',
            direccion: 'Calle Falsa 123',
            poblacion: 'Madrid',
            provincia: 'Madrid',
            pais: 'ES',
            status: ProviderStatus.Active,
            createdAt: fixedNow,
            updatedAt: fixedNow,
        });

        const providerRepository = new ProviderRepositorySpy({
            existingProvider: providerWithoutCif,
            duplicateByRazon: createProvider({ id: 'provider-2' }),
        });
        const auditLogger = new AuditLoggerSpy();

        const useCase = new UpdateProviderUseCase({
            providerRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            providerId: 'provider-1',
            razonSocial: 'Proveedor Uno',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderAlreadyExistsError);
        }
        expect(providerRepository.updatedProvider).toBeNull();
    });
});
