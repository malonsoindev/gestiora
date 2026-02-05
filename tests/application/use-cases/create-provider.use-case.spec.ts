import { describe, expect, it } from 'vitest';
import { CreateProviderUseCase } from '../../../src/application/use-cases/create-provider.use-case.js';
import type { AuditEvent, AuditLogger } from '../../../src/application/ports/audit-logger.js';
import type { DateProvider } from '../../../src/application/ports/date-provider.js';
import type { ProviderIdGenerator } from '../../../src/application/ports/provider-id-generator.js';
import type { ProviderRepository } from '../../../src/application/ports/provider.repository.js';
import type { PortError } from '../../../src/application/errors/port.error.js';
import { InvalidCifError } from '../../../src/domain/errors/invalid-cif.error.js';
import { ProviderAlreadyExistsError } from '../../../src/domain/errors/provider-already-exists.error.js';
import { Provider, ProviderStatus } from '../../../src/domain/entities/provider.entity.js';
import { Cif } from '../../../src/domain/value-objects/cif.value-object.js';
import { ok, type Result } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-02-03T10:00:00.000Z');

class DateProviderStub implements DateProvider {
    now(): Result<Date, PortError> {
        return ok(fixedNow);
    }
}

class ProviderIdGeneratorStub implements ProviderIdGenerator {
    constructor(private readonly id: string) {}

    generate(): string {
        return this.id;
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
    createdProvider: Provider | null = null;
    private readonly duplicateByCif: Provider | null;
    private readonly duplicateByRazon: Provider | null;

    constructor({ duplicateByCif = null, duplicateByRazon = null }: { duplicateByCif?: Provider | null; duplicateByRazon?: Provider | null } = {}) {
        this.duplicateByCif = duplicateByCif;
        this.duplicateByRazon = duplicateByRazon;
    }

    async findById() {
        return ok(null);
    }

    async list() {
        return ok({ items: [], total: 0 });
    }

    async create(provider: Provider) {
        this.createdProvider = provider;
        return ok(undefined);
    }

    async update() {
        return ok(undefined);
    }

    async findByCif() {
        return ok(this.duplicateByCif);
    }

    async findByRazonSocialNormalized() {
        return ok(this.duplicateByRazon);
    }
}

const createProviderEntity = (): Provider =>
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
    });

describe('CreateProviderUseCase', () => {
    it('creates a provider and audits the action', async () => {
        const providerRepository = new ProviderRepositorySpy();
        const auditLogger = new AuditLoggerSpy();
        const providerIdGenerator = new ProviderIdGeneratorStub('provider-fixed');

        const useCase = new CreateProviderUseCase({
            providerRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
            providerIdGenerator,
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            razonSocial: 'Proveedor Uno',
            cif: 'B12345678',
            direccion: 'Calle Falsa 123',
            poblacion: 'Madrid',
            provincia: 'Madrid',
            pais: 'ES',
        });

        expect(result.success).toBe(true);
        expect(providerRepository.createdProvider).not.toBeNull();
        expect(providerRepository.createdProvider?.id).toBe('provider-fixed');
        expect(providerRepository.createdProvider?.razonSocial).toBe('Proveedor Uno');
        expect(providerRepository.createdProvider?.cif).toBe('B12345678');
        expect(providerRepository.createdProvider?.status).toBe(ProviderStatus.Active);
        expect(providerRepository.createdProvider?.createdAt).toBe(fixedNow);
        expect(providerRepository.createdProvider?.updatedAt).toBe(fixedNow);
        expect(auditLogger.events.some((event) => event.action === 'PROVIDER_CREATED')).toBe(true);
    });

    it('rejects invalid cif', async () => {
        const providerRepository = new ProviderRepositorySpy();
        const auditLogger = new AuditLoggerSpy();
        const providerIdGenerator = new ProviderIdGeneratorStub('provider-fixed');

        const useCase = new CreateProviderUseCase({
            providerRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
            providerIdGenerator,
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            razonSocial: 'Proveedor Uno',
            cif: '12345678',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidCifError);
        }
        expect(providerRepository.createdProvider).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects duplicate provider by cif', async () => {
        const providerRepository = new ProviderRepositorySpy({ duplicateByCif: createProviderEntity() });
        const auditLogger = new AuditLoggerSpy();
        const providerIdGenerator = new ProviderIdGeneratorStub('provider-fixed');

        const useCase = new CreateProviderUseCase({
            providerRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
            providerIdGenerator,
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            razonSocial: 'Proveedor Uno',
            cif: 'B12345678',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderAlreadyExistsError);
        }
        expect(providerRepository.createdProvider).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects duplicate provider by normalized razonSocial when cif is missing', async () => {
        const providerRepository = new ProviderRepositorySpy({ duplicateByRazon: createProviderEntity() });
        const auditLogger = new AuditLoggerSpy();
        const providerIdGenerator = new ProviderIdGeneratorStub('provider-fixed');

        const useCase = new CreateProviderUseCase({
            providerRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
            providerIdGenerator,
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            razonSocial: '  Proveedor   Uno ',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderAlreadyExistsError);
        }
        expect(providerRepository.createdProvider).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });
});
