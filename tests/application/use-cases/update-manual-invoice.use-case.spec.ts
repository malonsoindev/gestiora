import { describe, expect, it } from 'vitest';
import { UpdateManualInvoiceUseCase } from '../../../src/application/use-cases/update-manual-invoice.use-case.js';
import type { AuditEvent, AuditLogger } from '../../../src/application/ports/audit-logger.js';
import type { DateProvider } from '../../../src/application/ports/date-provider.js';
import type { InvoiceMovementIdGenerator } from '../../../src/application/ports/invoice-movement-id-generator.js';
import type { InvoiceRepository } from '../../../src/application/ports/invoice.repository.js';
import type { PortError } from '../../../src/application/errors/port.error.js';
import { Invoice, InvoiceStatus } from '../../../src/domain/entities/invoice.entity.js';
import type { InvoiceProps } from '../../../src/domain/entities/invoice.entity.js';
import { InvoiceMovement } from '../../../src/domain/entities/invoice-movement.entity.js';
import { InvoiceDate } from '../../../src/domain/value-objects/invoice-date.value-object.js';
import { Money } from '../../../src/domain/value-objects/money.value-object.js';
import { InvoiceNotFoundError } from '../../../src/domain/errors/invoice-not-found.error.js';
import { InvalidInvoiceStatusError } from '../../../src/domain/errors/invalid-invoice-status.error.js';
import { ok, type Result } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-02-18T10:00:00.000Z');

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

class InvoiceRepositoryStub implements InvoiceRepository {
    updatedInvoice: Invoice | null = null;

    constructor(private readonly invoice: Invoice | null) {}

    async create() {
        return ok(undefined);
    }

    async findById() {
        return ok(this.invoice);
    }

    async update(invoice: Invoice) {
        this.updatedInvoice = invoice;
        return ok(undefined);
    }
}

const createMovement = (id: string, total: number): InvoiceMovement =>
    InvoiceMovement.create({
        id,
        concepto: `Servicio ${id}`,
        cantidad: 1,
        precio: total,
        baseImponible: total,
        iva: total * 0.21,
        total: total * 1.21,
    });

const createInvoice = (overrides: Partial<InvoiceProps> = {}): Invoice =>
    Invoice.create({
        id: 'invoice-1',
        providerId: 'provider-1',
        status: InvoiceStatus.Draft,
        numeroFactura: 'FAC-2026-0001',
        fechaOperacion: InvoiceDate.create('2026-02-10'),
        fechaVencimiento: InvoiceDate.create('2026-03-10'),
        baseImponible: Money.create(100),
        iva: Money.create(21),
        total: Money.create(121),
        movements: [createMovement('movement-1', 100)],
        createdAt: fixedNow,
        updatedAt: fixedNow,
        ...overrides,
    });

describe('UpdateManualInvoiceUseCase', () => {
    it('updates invoice header and movements', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(createInvoice());
        const auditLogger = new AuditLoggerSpy();
        const invoiceMovementIdGenerator = new InvoiceMovementIdGeneratorStub(['movement-2']);

        const useCase = new UpdateManualInvoiceUseCase({
            invoiceRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
            invoiceMovementIdGenerator,
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
            invoice: {
                numeroFactura: 'FAC-2026-0002',
                fechaOperacion: '2026-02-12',
                baseImponible: 200,
                iva: 42,
                total: 242,
                movements: [
                    {
                        concepto: 'Servicio actualizado',
                        cantidad: 1,
                        precio: 200,
                        baseImponible: 200,
                        iva: 42,
                        total: 242,
                    },
                ],
            },
        });

        expect(result.success).toBe(true);
        expect(invoiceRepository.updatedInvoice?.numeroFactura).toBe('FAC-2026-0002');
        expect(invoiceRepository.updatedInvoice?.movements).toHaveLength(1);
        expect(auditLogger.events.some((event) => event.action === 'INVOICE_MANUAL_UPDATED')).toBe(true);
    });

    it('rejects when invoice does not exist', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(null);
        const auditLogger = new AuditLoggerSpy();
        const invoiceMovementIdGenerator = new InvoiceMovementIdGeneratorStub(['movement-2']);

        const useCase = new UpdateManualInvoiceUseCase({
            invoiceRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
            invoiceMovementIdGenerator,
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'missing-invoice',
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
            expect(result.error).toBeInstanceOf(InvoiceNotFoundError);
        }
        expect(invoiceRepository.updatedInvoice).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects when invoice is deleted', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(
            createInvoice({
                status: InvoiceStatus.Deleted,
                deletedAt: new Date('2026-02-12T10:00:00.000Z'),
            }),
        );
        const auditLogger = new AuditLoggerSpy();
        const invoiceMovementIdGenerator = new InvoiceMovementIdGeneratorStub(['movement-2']);

        const useCase = new UpdateManualInvoiceUseCase({
            invoiceRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
            invoiceMovementIdGenerator,
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
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
            expect(result.error).toBeInstanceOf(InvalidInvoiceStatusError);
        }
        expect(invoiceRepository.updatedInvoice).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });
});
