import { describe, expect, it } from 'vitest';
import { ConfirmInvoiceMovementsUseCase } from '@application/use-cases/confirm-invoice-movements.use-case.js';
import { Invoice, InvoiceStatus } from '@domain/entities/invoice.entity.js';
import type { InvoiceProps } from '@domain/entities/invoice.entity.js';
import {
    InvoiceMovement,
    InvoiceMovementSource,
    InvoiceMovementStatus,
    type InvoiceMovementProps,
} from '@domain/entities/invoice-movement.entity.js';
import { InvoiceDate } from '@domain/value-objects/invoice-date.value-object.js';
import { Money } from '@domain/value-objects/money.value-object.js';
import { RagReindexInvoiceServiceStub } from '@tests/application/stubs/rag-reindex-invoice.service.stub.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import { InvoiceRepositoryStub } from '@tests/shared/stubs/invoice-repository.stub.js';

const fixedNow = new Date('2026-03-01T10:00:00.000Z');

const createMovement = (overrides: Partial<InvoiceMovementProps> = {}): InvoiceMovement =>
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
            dateProvider: new DateProviderStub(fixedNow),
            ragReindexInvoiceService: new RagReindexInvoiceServiceStub(),
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
        expect(updated).not.toBeNull();
        if (!updated) {
            return;
        }
        const movement = updated.movements[0];
        expect(movement).toBeTruthy();
        if (!movement) {
            return;
        }
        expect(movement.status).toBe(InvoiceMovementStatus.Confirmed);
        expect(movement.source).toBe(InvoiceMovementSource.Ai);
        expect(auditLogger.events.some((event) => event.action === 'INVOICE_MOVEMENTS_CONFIRMED')).toBe(true);
    });

    it('corrects AI movement and marks as manual confirmed', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(createInvoice());
        const auditLogger = new AuditLoggerSpy();

        const useCase = new ConfirmInvoiceMovementsUseCase({
            invoiceRepository,
            auditLogger,
            dateProvider: new DateProviderStub(fixedNow),
            ragReindexInvoiceService: new RagReindexInvoiceServiceStub(),
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
        expect(updated).not.toBeNull();
        if (!updated) {
            return;
        }
        const movement = updated.movements[0];
        expect(movement).toBeTruthy();
        if (!movement) {
            return;
        }
        expect(movement.concepto).toBe('Servicio corregido');
        expect(movement.cantidad).toBe(2);
        expect(movement.source).toBe(InvoiceMovementSource.Manual);
        expect(movement.status).toBe(InvoiceMovementStatus.Confirmed);
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
            dateProvider: new DateProviderStub(fixedNow),
            ragReindexInvoiceService: new RagReindexInvoiceServiceStub(),
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
