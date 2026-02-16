import { describe, expect, it } from 'vitest';
import { ConfirmInvoiceHeaderUseCase } from '@application/use-cases/confirm-invoice-header.use-case.js';
import { Invoice, InvoiceHeaderSource, InvoiceHeaderStatus, InvoiceStatus } from '@domain/entities/invoice.entity.js';
import type { InvoiceProps } from '@domain/entities/invoice.entity.js';
import { InvoiceMovement } from '@domain/entities/invoice-movement.entity.js';
import { InvoiceDate } from '@domain/value-objects/invoice-date.value-object.js';
import { Money } from '@domain/value-objects/money.value-object.js';
import { RagReindexInvoiceServiceStub } from '@tests/application/stubs/rag-reindex-invoice.service.stub.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import { InvoiceRepositoryStub } from '@tests/shared/stubs/invoice-repository.stub.js';
import { createTestInvoice } from '@tests/shared/fixtures/invoice.fixture.js';

const fixedNow = new Date('2026-03-02T10:00:00.000Z');

const createInvoice = (overrides: Partial<InvoiceProps> = {}): Invoice =>
    createTestInvoice({
        now: fixedNow,
        overrides: {
            status: InvoiceStatus.Active,
            numeroFactura: 'FAC-2026-0102',
            fechaOperacion: InvoiceDate.create('2026-02-28'),
            baseImponible: Money.create(100),
            iva: Money.create(21),
            total: Money.create(121),
            headerSource: InvoiceHeaderSource.Ai,
            headerStatus: InvoiceHeaderStatus.Proposed,
            movements: [
                InvoiceMovement.create({
                    id: 'movement-1',
                    concepto: 'Servicio',
                    cantidad: 1,
                    precio: 100,
                    baseImponible: 100,
                    iva: 21,
                    total: 121,
                }),
            ],
            ...overrides,
        },
    });

describe('ConfirmInvoiceHeaderUseCase', () => {
    it('confirms AI header fields without changing values', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(createInvoice());
        const auditLogger = new AuditLoggerSpy();

        const useCase = new ConfirmInvoiceHeaderUseCase({
            invoiceRepository,
            auditLogger,
            dateProvider: new DateProviderStub(fixedNow),
            ragReindexInvoiceService: new RagReindexInvoiceServiceStub(),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
            fields: {
                numeroFactura: { action: 'CONFIRM' },
                fechaOperacion: { action: 'CONFIRM' },
            },
        });

        expect(result.success).toBe(true);
        const updated = invoiceRepository.updatedInvoice;
        expect(updated?.numeroFactura).toBe('FAC-2026-0102');
        expect(updated?.headerStatus).toBe(InvoiceHeaderStatus.Confirmed);
        expect(updated?.headerSource).toBe(InvoiceHeaderSource.Ai);
        expect(auditLogger.events.some((event) => event.action === 'INVOICE_HEADER_CONFIRMED')).toBe(true);
    });

    it('corrects header fields and marks as manual confirmed', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(createInvoice());
        const auditLogger = new AuditLoggerSpy();

        const useCase = new ConfirmInvoiceHeaderUseCase({
            invoiceRepository,
            auditLogger,
            dateProvider: new DateProviderStub(fixedNow),
            ragReindexInvoiceService: new RagReindexInvoiceServiceStub(),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
            fields: {
                numeroFactura: { action: 'CORRECT', value: 'FAC-2026-0103' },
                total: { action: 'CORRECT', value: 130 },
            },
        });

        expect(result.success).toBe(true);
        const updated = invoiceRepository.updatedInvoice;
        expect(updated?.numeroFactura).toBe('FAC-2026-0103');
        expect(updated?.total).toBe(130);
        expect(updated?.headerSource).toBe(InvoiceHeaderSource.Manual);
        expect(updated?.headerStatus).toBe(InvoiceHeaderStatus.Confirmed);
    });

    it('keeps manual header fields when not provided', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(
            createInvoice({
                headerSource: InvoiceHeaderSource.Manual,
                headerStatus: InvoiceHeaderStatus.Confirmed,
            }),
        );
        const auditLogger = new AuditLoggerSpy();

        const useCase = new ConfirmInvoiceHeaderUseCase({
            invoiceRepository,
            auditLogger,
            dateProvider: new DateProviderStub(fixedNow),
            ragReindexInvoiceService: new RagReindexInvoiceServiceStub(),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
            fields: {
                fechaOperacion: { action: 'CONFIRM' },
            },
        });

        expect(result.success).toBe(true);
        const updated = invoiceRepository.updatedInvoice;
        expect(updated?.headerSource).toBe(InvoiceHeaderSource.Manual);
        expect(updated?.headerStatus).toBe(InvoiceHeaderStatus.Confirmed);
    });
});
