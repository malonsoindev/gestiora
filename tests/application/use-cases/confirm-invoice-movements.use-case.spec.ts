import { describe, expect, it } from 'vitest';
import { ConfirmInvoiceMovementsUseCase } from '../../../src/application/use-cases/confirm-invoice-movements.use-case.js';
import type { AuditEvent, AuditLogger } from '../../../src/application/ports/audit-logger.js';
import type { DateProvider } from '../../../src/application/ports/date-provider.js';
import type { InvoiceRepository } from '../../../src/application/ports/invoice.repository.js';
import type { PortError } from '../../../src/application/errors/port.error.js';
import { Invoice, InvoiceStatus } from '../../../src/domain/entities/invoice.entity.js';
import type { InvoiceProps } from '../../../src/domain/entities/invoice.entity.js';
import {
    InvoiceMovement,
    InvoiceMovementSource,
    InvoiceMovementStatus,
} from '../../../src/domain/entities/invoice-movement.entity.js';
import { InvoiceDate } from '../../../src/domain/value-objects/invoice-date.value-object.js';
import { Money } from '../../../src/domain/value-objects/money.value-object.js';
import { ok, type Result } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-03-01T10:00:00.000Z');

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

    async list() {
        return ok({ items: [], total: 0 });
    }

    async getDetail() {
        return ok(null);
    }
}

const createMovement = (overrides: Partial<InvoiceMovement> = {}): InvoiceMovement =>
    InvoiceMovement.create({
        id: 'movement-1',
        concepto: 'Servicio AI',
        cantidad: 1,
        precio: 100,
        baseImponible: 100,
        iva: 21,
        total: 121,
        source: InvoiceMovementSource.Ai,
        status: InvoiceMovementStatus.Proposed,
        ...overrides,
    });

const createInvoice = (overrides: Partial<InvoiceProps> = {}): Invoice =>
    Invoice.create({
        id: 'invoice-1',
        providerId: 'provider-1',
        status: InvoiceStatus.Active,
        numeroFactura: 'FAC-2026-0101',
        fechaOperacion: InvoiceDate.create('2026-02-28'),
        baseImponible: Money.create(100),
        iva: Money.create(21),
        total: Money.create(121),
        movements: [createMovement()],
        createdAt: fixedNow,
        updatedAt: fixedNow,
        ...overrides,
    });

describe('ConfirmInvoiceMovementsUseCase', () => {
    it('confirms AI movement without changing values', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(createInvoice());
        const auditLogger = new AuditLoggerSpy();

        const useCase = new ConfirmInvoiceMovementsUseCase({
            invoiceRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
            movements: [
                {
                    id: 'movement-1',
                    action: 'CONFIRM',
                },
            ],
        });

        expect(result.success).toBe(true);
        const updated = invoiceRepository.updatedInvoice;
        expect(updated?.movements[0].status).toBe(InvoiceMovementStatus.Confirmed);
        expect(updated?.movements[0].source).toBe(InvoiceMovementSource.Ai);
        expect(auditLogger.events.some((event) => event.action === 'INVOICE_MOVEMENTS_CONFIRMED')).toBe(true);
    });

    it('corrects AI movement and marks as manual confirmed', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(createInvoice());
        const auditLogger = new AuditLoggerSpy();

        const useCase = new ConfirmInvoiceMovementsUseCase({
            invoiceRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
            movements: [
                {
                    id: 'movement-1',
                    action: 'CORRECT',
                    concepto: 'Servicio corregido',
                    cantidad: 2,
                    precio: 50,
                    baseImponible: 100,
                    iva: 21,
                    total: 121,
                },
            ],
        });

        expect(result.success).toBe(true);
        const updated = invoiceRepository.updatedInvoice;
        expect(updated?.movements[0].concepto).toBe('Servicio corregido');
        expect(updated?.movements[0].cantidad).toBe(2);
        expect(updated?.movements[0].source).toBe(InvoiceMovementSource.Manual);
        expect(updated?.movements[0].status).toBe(InvoiceMovementStatus.Confirmed);
    });

    it('does not overwrite manual movement when not provided', async () => {
        const manualMovement = createMovement({
            id: 'movement-manual',
            concepto: 'Manual',
            source: InvoiceMovementSource.Manual,
            status: InvoiceMovementStatus.Confirmed,
        });
        const invoiceRepository = new InvoiceRepositoryStub(
            createInvoice({
                movements: [manualMovement, createMovement({ id: 'movement-ai' })],
            }),
        );
        const auditLogger = new AuditLoggerSpy();

        const useCase = new ConfirmInvoiceMovementsUseCase({
            invoiceRepository,
            auditLogger,
            dateProvider: new DateProviderStub(),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
            movements: [
                {
                    id: 'movement-ai',
                    action: 'CONFIRM',
                },
            ],
        });

        expect(result.success).toBe(true);
        const updated = invoiceRepository.updatedInvoice;
        const kept = updated?.movements.find((movement) => movement.id === 'movement-manual');
        expect(kept?.concepto).toBe('Manual');
        expect(kept?.source).toBe(InvoiceMovementSource.Manual);
    });
});
