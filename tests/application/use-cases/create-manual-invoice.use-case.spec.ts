import { describe, expect, it } from 'vitest';
import { CreateManualInvoiceUseCase } from '@application/use-cases/create-manual-invoice.use-case.js';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import { InvalidCifError } from '@domain/errors/invalid-cif.error.js';
import { InvalidProviderStatusError } from '@domain/errors/invalid-provider-status.error.js';
import { InvalidInvoiceTotalsError } from '@domain/errors/invalid-invoice-totals.error.js';
import { ProviderNotFoundError } from '@domain/errors/provider-not-found.error.js';
import { RagReindexInvoiceServiceStub } from '../stubs/rag-reindex-invoice.service.stub.js';
import { DateProviderStub } from '../../shared/stubs/date-provider.stub.js';
import { InvoiceIdGeneratorStub } from '../../shared/stubs/invoice-id-generator.stub.js';
import { InvoiceMovementIdGeneratorStub } from '../../shared/stubs/invoice-movement-id-generator.stub.js';
import { ProviderRepositoryStub } from '../../shared/stubs/provider-repository.stub.js';
import { AuditLoggerSpy } from '../../shared/spies/audit-logger.spy.js';
import { InvoiceRepositorySpy } from '../../shared/spies/invoice-repository.spy.js';
import { fixedNow } from '../../shared/fixed-now.js';

const createProvider = (status: ProviderStatus = ProviderStatus.Active): Provider =>
    Provider.create({
        id: 'provider-1',
        razonSocial: 'Proveedor Uno',
        status,
        createdAt: fixedNow,
        updatedAt: fixedNow,
    });

type SutOverrides = Partial<{
    provider: Provider | null;
    invoiceId: string;
    movementIds: string[];
    now: Date;
}>;

const makeSut = (overrides: SutOverrides = {}) => {
    const now = overrides.now ?? fixedNow;
    const provider = overrides.provider === undefined ? createProvider() : overrides.provider;
    const providerRepository = new ProviderRepositoryStub(provider);
    const invoiceRepository = new InvoiceRepositorySpy();
    const auditLogger = new AuditLoggerSpy();

    const useCase = new CreateManualInvoiceUseCase({
        providerRepository,
        invoiceRepository,
        auditLogger,
        dateProvider: new DateProviderStub(now),
        invoiceIdGenerator: new InvoiceIdGeneratorStub(overrides.invoiceId ?? 'invoice-fixed'),
        invoiceMovementIdGenerator: new InvoiceMovementIdGeneratorStub(overrides.movementIds ?? ['movement-1']),
        ragReindexInvoiceService: new RagReindexInvoiceServiceStub(),
    });

    return {
        useCase,
        providerRepository,
        invoiceRepository,
        auditLogger,
    };
};

describe('CreateManualInvoiceUseCase', () => {
    it('creates a draft invoice and audits the action', async () => {
        const { useCase, invoiceRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            actorUserId: 'user-1',
            providerId: 'provider-1',
            invoice: {
                numeroFactura: 'FAC-2026-0001',
                fechaOperacion: '2026-02-10',
                fechaVencimiento: '2026-03-10',
                baseImponible: 300,
                iva: 63,
                total: 363,
                movements: [
                    {
                        concepto: 'Servicio',
                        cantidad: 1,
                        precio: 300,
                        baseImponible: 300,
                        iva: 63,
                        total: 363,
                    },
                ],
            },
        });

        expect(result.success).toBe(true);
        expect(invoiceRepository.createdInvoice).not.toBeNull();
        if (result.success) {
            expect(result.value.invoiceId).toBe('invoice-fixed');
        }
        expect(auditLogger.events.some((event) => event.action === 'INVOICE_MANUAL_CREATED')).toBe(true);
    });

    it('finds provider by normalized cif when providerId is missing', async () => {
        const { useCase, providerRepository } = makeSut();

        const result = await useCase.execute({
            actorUserId: 'user-1',
            providerCif: ' b-123 456 78 ',
            invoice: {
                numeroFactura: 'FAC-2026-0002',
                fechaOperacion: '2026-02-10',
                total: 100,
                movements: [
                    {
                        concepto: 'Servicio',
                        cantidad: 1,
                        precio: 100,
                        total: 100,
                    },
                ],
            },
        });

        expect(result.success).toBe(true);
        expect(providerRepository.lastCif).toBe('B12345678');
    });

    it('rejects when provider does not exist', async () => {
        const { useCase, invoiceRepository, auditLogger } = makeSut({ provider: null });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            providerId: 'missing-provider',
            invoice: {
                total: 100,
                movements: [
                    {
                        concepto: 'Servicio',
                        cantidad: 1,
                        precio: 100,
                        total: 100,
                    },
                ],
            },
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderNotFoundError);
        }
        expect(invoiceRepository.createdInvoice).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects when provider is inactive', async () => {
        const { useCase, invoiceRepository, auditLogger } = makeSut({
            provider: createProvider(ProviderStatus.Inactive),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            providerId: 'provider-1',
            invoice: {
                total: 100,
                movements: [
                    {
                        concepto: 'Servicio',
                        cantidad: 1,
                        precio: 100,
                        total: 100,
                    },
                ],
            },
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidProviderStatusError);
        }
        expect(invoiceRepository.createdInvoice).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects invalid provider cif', async () => {
        const { useCase, invoiceRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            actorUserId: 'user-1',
            providerCif: '12345678',
            invoice: {
                total: 100,
                movements: [
                    {
                        concepto: 'Servicio',
                        cantidad: 1,
                        precio: 100,
                        total: 100,
                    },
                ],
            },
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidCifError);
        }
        expect(invoiceRepository.createdInvoice).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects when invoice totals do not match movements', async () => {
        const { useCase, invoiceRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            actorUserId: 'user-1',
            providerId: 'provider-1',
            invoice: {
                baseImponible: 300,
                iva: 63,
                total: 999,
                movements: [
                    {
                        concepto: 'Servicio',
                        cantidad: 1,
                        precio: 300,
                        baseImponible: 300,
                        iva: 63,
                        total: 363,
                    },
                ],
            },
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidInvoiceTotalsError);
        }
        expect(invoiceRepository.createdInvoice).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects when a movement base does not match cantidad * precio', async () => {
        const { useCase, invoiceRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            actorUserId: 'user-1',
            providerId: 'provider-1',
            invoice: {
                baseImponible: 300,
                iva: 63,
                total: 363,
                movements: [
                    {
                        concepto: 'Servicio',
                        cantidad: 2,
                        precio: 150,
                        baseImponible: 200,
                        iva: 63,
                        total: 363,
                    },
                ],
            },
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidInvoiceTotalsError);
        }
        expect(invoiceRepository.createdInvoice).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });
});
