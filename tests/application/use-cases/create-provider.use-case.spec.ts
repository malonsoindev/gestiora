import { describe, expect, it } from 'vitest';
import { CreateProviderUseCase } from '@application/use-cases/create-provider.use-case.js';
import type { IdGenerator } from '@application/ports/id-generator.js';
import { PortError } from '@application/errors/port.error.js';
import { InvalidCifError } from '@domain/errors/invalid-cif.error.js';
import { ProviderAlreadyExistsError } from '@domain/errors/provider-already-exists.error.js';
import { ProviderStatus } from '@domain/entities/provider.entity.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import { ProviderRepositorySpy } from '@tests/shared/spies/provider-repository.spy.js';
import { createTestProvider } from '@tests/shared/fixtures/provider.fixture.js';
import { fixedNow } from '@tests/shared/fixed-now.js';
import {
    FailingDateProvider,
    FailingAuditLogger,
    FailingProviderRepositoryOnMethod,
} from '@tests/shared/stubs/failing-stubs.js';

class ProviderIdGeneratorStub implements IdGenerator {
    constructor(private readonly id: string) {}

    generate(): string {
        return this.id;
    }
}

const createProviderEntity = () =>
    createTestProvider({
        now: fixedNow,
        overrides: {
            cif: Cif.create('B12345678'),
            status: ProviderStatus.Active,
        },
    });

describe('CreateProviderUseCase', () => {
    it('creates a provider and audits the action', async () => {
        const providerRepository = new ProviderRepositorySpy();
        const auditLogger = new AuditLoggerSpy();
        const providerIdGenerator = new ProviderIdGeneratorStub('provider-fixed');

        const useCase = new CreateProviderUseCase({
            providerRepository,
            auditLogger,
            dateProvider: new DateProviderStub(fixedNow),
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
            dateProvider: new DateProviderStub(fixedNow),
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
            dateProvider: new DateProviderStub(fixedNow),
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
            dateProvider: new DateProviderStub(fixedNow),
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

    describe('PortError propagation', () => {
        it('propagates PortError when DateProvider.now fails', async () => {
            const providerRepository = new ProviderRepositorySpy();
            const auditLogger = new AuditLoggerSpy();
            const providerIdGenerator = new ProviderIdGeneratorStub('provider-fixed');

            const useCase = new CreateProviderUseCase({
                providerRepository,
                auditLogger,
                dateProvider: new FailingDateProvider(),
                providerIdGenerator,
            });

            const result = await useCase.execute({
                actorUserId: 'user-1',
                razonSocial: 'Proveedor Uno',
                cif: 'B12345678',
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('DateProvider');
            }
        });

        it('propagates PortError when ProviderRepository.findByCif fails', async () => {
            const providerRepository = new FailingProviderRepositoryOnMethod('findByCif');
            const auditLogger = new AuditLoggerSpy();
            const providerIdGenerator = new ProviderIdGeneratorStub('provider-fixed');

            const useCase = new CreateProviderUseCase({
                providerRepository,
                auditLogger,
                dateProvider: new DateProviderStub(fixedNow),
                providerIdGenerator,
            });

            const result = await useCase.execute({
                actorUserId: 'user-1',
                razonSocial: 'Proveedor Uno',
                cif: 'B12345678',
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('ProviderRepository');
            }
        });

        it('propagates PortError when ProviderRepository.findByRazonSocialNormalized fails', async () => {
            const providerRepository = new FailingProviderRepositoryOnMethod('findByRazonSocialNormalized');
            const auditLogger = new AuditLoggerSpy();
            const providerIdGenerator = new ProviderIdGeneratorStub('provider-fixed');

            const useCase = new CreateProviderUseCase({
                providerRepository,
                auditLogger,
                dateProvider: new DateProviderStub(fixedNow),
                providerIdGenerator,
            });

            const result = await useCase.execute({
                actorUserId: 'user-1',
                razonSocial: 'Proveedor Uno',
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('ProviderRepository');
            }
        });

        it('propagates PortError when ProviderRepository.create fails', async () => {
            const providerRepository = new FailingProviderRepositoryOnMethod('create');
            const auditLogger = new AuditLoggerSpy();
            const providerIdGenerator = new ProviderIdGeneratorStub('provider-fixed');

            const useCase = new CreateProviderUseCase({
                providerRepository,
                auditLogger,
                dateProvider: new DateProviderStub(fixedNow),
                providerIdGenerator,
            });

            const result = await useCase.execute({
                actorUserId: 'user-1',
                razonSocial: 'Proveedor Uno',
                cif: 'B12345678',
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('ProviderRepository');
            }
        });

        it('propagates PortError when AuditLogger.log fails', async () => {
            const providerRepository = new ProviderRepositorySpy();
            const auditLogger = new FailingAuditLogger();
            const providerIdGenerator = new ProviderIdGeneratorStub('provider-fixed');

            const useCase = new CreateProviderUseCase({
                providerRepository,
                auditLogger,
                dateProvider: new DateProviderStub(fixedNow),
                providerIdGenerator,
            });

            const result = await useCase.execute({
                actorUserId: 'user-1',
                razonSocial: 'Proveedor Uno',
                cif: 'B12345678',
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('AuditLogger');
            }
        });
    });
});
