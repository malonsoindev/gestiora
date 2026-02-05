import { describe, expect, it } from 'vitest';
import { CreateManualInvoiceUseCase } from '../../../src/application/use-cases/create-manual-invoice.use-case.js';
import type { AuditEvent, AuditLogger } from '../../../src/application/ports/audit-logger.js';
import type { DateProvider } from '../../../src/application/ports/date-provider.js';
import type { InvoiceIdGenerator } from '../../../src/application/ports/invoice-id-generator.js';
import type { InvoiceMovementIdGenerator } from '../../../src/application/ports/invoice-movement-id-generator.js';
import type { InvoiceRepository } from '../../../src/application/ports/invoice.repository.js';
import type { ProviderRepository } from '../../../src/application/ports/provider.repository.js';
import type { PortError } from '../../../src/application/errors/port.error.js';
import { Provider, ProviderStatus } from '../../../src/domain/entities/provider.entity.js';
import { InvalidCifError } from '../../../src/domain/errors/invalid-cif.error.js';
import { InvalidProviderStatusError } from '../../../src/domain/errors/invalid-provider-status.error.js';
import { ProviderNotFoundError } from '../../../src/domain/errors/provider-not-found.error.js';
import { ok, type Result } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-02-10T10:00:00.000Z');

class DateProviderStub implements DateProvider {
    now(): Result<Date, PortError> {
        return ok(fixedNow);
    }
}

class InvoiceIdGeneratorStub implements InvoiceIdGenerator {
    constructor(private readonly id: string) {}

    generate(): string {
        return this.id;
    }
}

class InvoiceMovementIdGeneratorStub implements InvoiceMovementIdGenerator {
    private readonly ids: string[];

    constructor(ids: string[]) {
        this.ids = [...ids];
    }

    generate(): string {
        const id = this.ids.shift();
        return id ?? 'movement-fallback';
    }
}

class AuditLoggerSpy implements AuditLogger {
    events: AuditEvent[] = [];

    async log(event: AuditEvent) {
        this.events.push(event);
        return ok(undefined);
    }
}

class ProviderRepositoryStub implements ProviderRepository {
    lastCif: string | null = null;

    constructor(private readonly provider: Provider | null) {}

    async findById() {
        return ok(this.provider);
    }

    async list() {
        return ok({ items: [], total: 0 });
    }

    async create() {
        return ok(undefined);
    }

    async update() {
        return ok(undefined);
    }

    async findByCif(cif: string) {
        this.lastCif = cif;
        return ok(this.provider);
    }

    async findByRazonSocialNormalized() {
        return ok(null);
    }
}

class InvoiceRepositorySpy implements InvoiceRepository {
    createdInvoice = null as unknown;

    async create(invoice: unknown) {
        this.createdInvoice = invoice;
        return ok(undefined);
    }
}

const createProvider = (status: ProviderStatus = ProviderStatus.Active): Provider =>
    Provider.create({
        id: 'provider-1',
        razonSocial: 'Proveedor Uno',
        status,
        createdAt: fixedNow,
        updatedAt: fixedNow,
    });

describe('CreateManualInvoiceUseCase', () => {
    it('creates a draft invoice and audits the action', async () => {
        const providerRepository = new ProviderRepositoryStub(createProvider());
        const invoiceRepository = new InvoiceRepositorySpy();
        const auditLogger = new AuditLoggerSpy();
        const invoiceIdGenerator = new InvoiceIdGeneratorStub('invoice-fixed');
        const invoiceMovementIdGenerator = new InvoiceMovementIdGeneratorStub(['movement-1']);

        const useCase = new CreateManualInvoiceUseCase({
            providerRepository,
            invoiceRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
            invoiceIdGenerator,
            invoiceMovementIdGenerator,
        });

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
        const providerRepository = new ProviderRepositoryStub(createProvider());
        const invoiceRepository = new InvoiceRepositorySpy();
        const auditLogger = new AuditLoggerSpy();
        const invoiceIdGenerator = new InvoiceIdGeneratorStub('invoice-fixed');
        const invoiceMovementIdGenerator = new InvoiceMovementIdGeneratorStub(['movement-1']);

        const useCase = new CreateManualInvoiceUseCase({
            providerRepository,
            invoiceRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
            invoiceIdGenerator,
            invoiceMovementIdGenerator,
        });

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
        const providerRepository = new ProviderRepositoryStub(null);
        const invoiceRepository = new InvoiceRepositorySpy();
        const auditLogger = new AuditLoggerSpy();
        const invoiceIdGenerator = new InvoiceIdGeneratorStub('invoice-fixed');
        const invoiceMovementIdGenerator = new InvoiceMovementIdGeneratorStub(['movement-1']);

        const useCase = new CreateManualInvoiceUseCase({
            providerRepository,
            invoiceRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
            invoiceIdGenerator,
            invoiceMovementIdGenerator,
        });

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
        const providerRepository = new ProviderRepositoryStub(createProvider(ProviderStatus.Inactive));
        const invoiceRepository = new InvoiceRepositorySpy();
        const auditLogger = new AuditLoggerSpy();
        const invoiceIdGenerator = new InvoiceIdGeneratorStub('invoice-fixed');
        const invoiceMovementIdGenerator = new InvoiceMovementIdGeneratorStub(['movement-1']);

        const useCase = new CreateManualInvoiceUseCase({
            providerRepository,
            invoiceRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
            invoiceIdGenerator,
            invoiceMovementIdGenerator,
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
        const providerRepository = new ProviderRepositoryStub(createProvider());
        const invoiceRepository = new InvoiceRepositorySpy();
        const auditLogger = new AuditLoggerSpy();
        const invoiceIdGenerator = new InvoiceIdGeneratorStub('invoice-fixed');
        const invoiceMovementIdGenerator = new InvoiceMovementIdGeneratorStub(['movement-1']);

        const useCase = new CreateManualInvoiceUseCase({
            providerRepository,
            invoiceRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
            invoiceIdGenerator,
            invoiceMovementIdGenerator,
        });

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
});
