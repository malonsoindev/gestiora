import { describe, expect, it } from 'vitest';
import { CreateManualInvoiceUseCase } from '@application/use-cases/create-manual-invoice.use-case.js';
import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { InvoiceRepository } from '@application/ports/invoice.repository.js';
import type { ProviderRepository, ProviderListFilters, ProviderListResult } from '@application/ports/provider.repository.js';
import type { RagReindexInvoiceHandler } from '@application/services/rag-reindex-invoice.service.js';
import { PortError } from '@application/errors/port.error.js';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import { InvalidCifError } from '@domain/errors/invalid-cif.error.js';
import { InvalidProviderStatusError } from '@domain/errors/invalid-provider-status.error.js';
import { InvalidInvoiceTotalsError } from '@domain/errors/invalid-invoice-totals.error.js';
import { ProviderNotFoundError } from '@domain/errors/provider-not-found.error.js';
import { fail, ok, type Result } from '@shared/result.js';
import { RagReindexInvoiceServiceStub } from '@tests/shared/stubs/rag-reindex-invoice.service.stub.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { IdGeneratorStub } from '@tests/shared/stubs/id-generator.stub.js';
import { ProviderRepositoryStub } from '@tests/shared/stubs/provider-repository.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import { InvoiceRepositorySpy } from '@tests/shared/spies/invoice-repository.spy.js';
import { fixedNow } from '@tests/shared/fixed-now.js';
import { createTestProvider } from '@tests/shared/fixtures/provider.fixture.js';
import {
    FailingDateProvider,
    FailingAuditLogger,
    FailingInvoiceRepository,
    FailingRagReindexService,
} from '@tests/shared/stubs/failing-stubs.js';

// Local stub with conditional failure logic (not suitable for centralized failing-stubs)
class FailingProviderRepositoryOnMethod implements ProviderRepository {
    constructor(
        private readonly provider: Provider | null,
        private readonly failOn: 'findById' | 'findByCif',
    ) {}

    async findById(_providerId: string): Promise<Result<Provider | null, PortError>> {
        if (this.failOn === 'findById') {
            return fail(new PortError('ProviderRepository', 'Database read error'));
        }
        return ok(this.provider);
    }

    async findByCif(_cif: string): Promise<Result<Provider | null, PortError>> {
        if (this.failOn === 'findByCif') {
            return fail(new PortError('ProviderRepository', 'Database read error'));
        }
        return ok(this.provider);
    }

    async create(_provider: Provider): Promise<Result<void, PortError>> {
        return ok(undefined);
    }

    async update(_provider: Provider): Promise<Result<void, PortError>> {
        return ok(undefined);
    }

    async list(_filters: ProviderListFilters): Promise<Result<ProviderListResult, PortError>> {
        return ok({ items: [], total: 0 });
    }

    async findByRazonSocialNormalized(_normalized: string): Promise<Result<Provider | null, PortError>> {
        return ok(null);
    }
}

const createProvider = (status: ProviderStatus = ProviderStatus.Active): Provider =>
    createTestProvider({
        now: fixedNow,
        overrides: {
            razonSocial: 'Proveedor Uno',
            status,
        },
    });

type SutOverrides = Partial<{
    provider: Provider | null;
    invoiceId: string;
    movementIds: string[];
    now: Date;
    dateProvider: DateProvider;
    auditLogger: AuditLogger;
    providerRepository: ProviderRepository;
    invoiceRepository: InvoiceRepository;
    ragReindexInvoiceService: RagReindexInvoiceHandler;
}>;

const makeSut = (overrides: SutOverrides = {}) => {
    const now = overrides.now ?? fixedNow;
    const provider = overrides.provider === undefined ? createProvider() : overrides.provider;
    const providerRepository = overrides.providerRepository ?? new ProviderRepositoryStub(provider);
    const invoiceRepository = overrides.invoiceRepository ?? new InvoiceRepositorySpy();
    const auditLogger = overrides.auditLogger ?? new AuditLoggerSpy();
    const dateProvider = overrides.dateProvider ?? new DateProviderStub(now);
    const ragReindexInvoiceService = overrides.ragReindexInvoiceService ?? new RagReindexInvoiceServiceStub();

    const useCase = new CreateManualInvoiceUseCase({
        providerRepository,
        invoiceRepository,
        auditLogger,
        dateProvider,
        invoiceIdGenerator: new IdGeneratorStub(overrides.invoiceId ?? 'invoice-fixed'),
        invoiceMovementIdGenerator: new IdGeneratorStub(overrides.movementIds ?? ['movement-1']),
        ragReindexInvoiceService,
    });

    return { useCase };
};

const makeSutWithSpies = (overrides: Omit<SutOverrides, 'dateProvider' | 'auditLogger' | 'providerRepository' | 'invoiceRepository' | 'ragReindexInvoiceService'> = {}) => {
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
        invoiceIdGenerator: new IdGeneratorStub(overrides.invoiceId ?? 'invoice-fixed'),
        invoiceMovementIdGenerator: new IdGeneratorStub(overrides.movementIds ?? ['movement-1']),
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
        const { useCase, invoiceRepository, auditLogger } = makeSutWithSpies();

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
        const { useCase, providerRepository } = makeSutWithSpies();

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
        const { useCase, invoiceRepository, auditLogger } = makeSutWithSpies({ provider: null });

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
        const { useCase, invoiceRepository, auditLogger } = makeSutWithSpies({
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
        const { useCase, invoiceRepository, auditLogger } = makeSutWithSpies();

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
        const { useCase, invoiceRepository, auditLogger } = makeSutWithSpies();

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
        const { useCase, invoiceRepository, auditLogger } = makeSutWithSpies();

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

    describe('PortError propagation', () => {
        const validInput = {
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
        };

        it('propagates PortError when DateProvider.now fails', async () => {
            const { useCase } = makeSut({ dateProvider: new FailingDateProvider() });

            const result = await useCase.execute(validInput);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('DateProvider');
            }
        });

        it('propagates PortError when ProviderRepository.findById fails', async () => {
            const provider = createProvider();
            const { useCase } = makeSut({
                providerRepository: new FailingProviderRepositoryOnMethod(provider, 'findById'),
            });

            const result = await useCase.execute(validInput);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('ProviderRepository');
            }
        });

        it('propagates PortError when ProviderRepository.findByCif fails', async () => {
            const provider = createProvider();
            const { useCase } = makeSut({
                providerRepository: new FailingProviderRepositoryOnMethod(provider, 'findByCif'),
            });

            const inputWithCif = {
                actorUserId: 'user-1',
                providerCif: 'B12345678',
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
            };

            const result = await useCase.execute(inputWithCif);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('ProviderRepository');
            }
        });

        it('propagates PortError when InvoiceRepository.create fails', async () => {
            const { useCase } = makeSut({
                invoiceRepository: new FailingInvoiceRepository(),
            });

            const result = await useCase.execute(validInput);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('InvoiceRepository');
            }
        });

        it('propagates PortError when AuditLogger.log fails', async () => {
            const { useCase } = makeSut({
                auditLogger: new FailingAuditLogger(),
            });

            const result = await useCase.execute(validInput);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('AuditLogger');
            }
        });

        it('propagates PortError when RagReindexInvoiceService.reindex fails', async () => {
            const { useCase } = makeSut({
                ragReindexInvoiceService: new FailingRagReindexService(),
            });

            const result = await useCase.execute(validInput);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('RagReindexService');
            }
        });
    });
});
