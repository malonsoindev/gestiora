import { describe, expect, it } from 'vitest';
import { UpdateProviderUseCase } from '@application/use-cases/update-provider.use-case.js';
import { InvalidCifError } from '@domain/errors/invalid-cif.error.js';
import { ProviderAlreadyExistsError } from '@domain/errors/provider-already-exists.error.js';
import { ProviderNotFoundError } from '@domain/errors/provider-not-found.error.js';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import type { ProviderProps } from '@domain/entities/provider.entity.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';
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
    existingProvider: Provider | null;
    duplicateByCif: Provider | null;
    duplicateByRazon: Provider | null;
    now: Date;
}>;

const makeSut = (overrides: SutOverrides = {}) => {
    const now = overrides.now ?? fixedNow;
    const existingProvider = overrides.existingProvider === undefined ? createProvider() : overrides.existingProvider;
    const providerRepository = new ProviderRepositorySpy({
        existingProvider,
        duplicateByCif: overrides.duplicateByCif ?? null,
        duplicateByRazon: overrides.duplicateByRazon ?? null,
    });
    const auditLogger = new AuditLoggerSpy();

    const useCase = new UpdateProviderUseCase({
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

describe('UpdateProviderUseCase', () => {
    it('updates provider data and audits the action', async () => {
        const { useCase, providerRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            ...baseCommand,
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
        const { useCase, providerRepository } = makeSut({ existingProvider: null });

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
        const { useCase, providerRepository } = makeSut({
            existingProvider: createProvider({ deletedAt: new Date('2026-02-01T00:00:00.000Z') }),
        });

        const result = await useCase.execute({
            ...baseCommand,
            razonSocial: 'Proveedor Actualizado',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderNotFoundError);
        }
        expect(providerRepository.updatedProvider).toBeNull();
    });

    it('rejects invalid cif', async () => {
        const { useCase, providerRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            ...baseCommand,
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
        const { useCase, providerRepository } = makeSut({
            duplicateByCif: createProvider({ id: 'provider-2', cif: Cif.create('A87654321') }),
        });

        const result = await useCase.execute({
            ...baseCommand,
            cif: 'A87654321',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderAlreadyExistsError);
        }
        expect(providerRepository.updatedProvider).toBeNull();
    });

    it('rejects duplicate provider by razonSocial when cif is missing and razonSocial changes', async () => {
        const providerWithoutCif = createTestProvider({
            now: fixedNow,
            omitCif: true,
            overrides: {
                razonSocial: 'Proveedor Uno',
                status: ProviderStatus.Active,
            },
        });
        const { useCase, providerRepository } = makeSut({
            existingProvider: providerWithoutCif,
            duplicateByRazon: createProvider({ id: 'provider-2' }),
        });

        const result = await useCase.execute({
            ...baseCommand,
            razonSocial: 'Proveedor Uno',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderAlreadyExistsError);
        }
        expect(providerRepository.updatedProvider).toBeNull();
    });
});
