import { describe, expect, it } from 'vitest';
import { SoftDeleteInvoiceUseCase } from '@application/use-cases/soft-delete-invoice.use-case.js';
import { Invoice, InvoiceStatus } from '@domain/entities/invoice.entity.js';
import type { InvoiceProps } from '@domain/entities/invoice.entity.js';
import { InvoiceMovement } from '@domain/entities/invoice-movement.entity.js';
import { InvoiceDate } from '@domain/value-objects/invoice-date.value-object.js';
import { Money } from '@domain/value-objects/money.value-object.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import { RagReindexInvoiceServiceStub } from '@tests/application/stubs/rag-reindex-invoice.service.stub.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import { InvoiceRepositoryStub } from '@tests/shared/stubs/invoice-repository.stub.js';

const fixedNow = new Date('2026-02-22T10:00:00.000Z');

const createInvoice = (overrides: Partial<InvoiceProps> = {}): Invoice =>
    Invoice.create({
        id: 'invoice-1',
        providerId: 'provider-1',
        status: InvoiceStatus.Active,
        numeroFactura: 'FAC-2026-0001',
        fechaOperacion: InvoiceDate.create('2026-02-10'),
        fechaVencimiento: InvoiceDate.create('2026-03-10'),
        baseImponible: Money.create(100),
        iva: Money.create(21),
        total: Money.create(121),
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
        createdAt: fixedNow,
        updatedAt: fixedNow,
        ...overrides,
    });

describe('SoftDeleteInvoiceUseCase', () => {
    it('marks invoice as deleted and audits', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(createInvoice());
        const auditLogger = new AuditLoggerSpy();

        const useCase = new SoftDeleteInvoiceUseCase({
            invoiceRepository,
            auditLogger,
        dateProvider: new DateProviderStub(fixedNow),
        ragReindexInvoiceService: new RagReindexInvoiceServiceStub(),
    });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
        });

        expect(result.success).toBe(true);
        expect(invoiceRepository.updatedInvoice?.status).toBe(InvoiceStatus.Deleted);
        expect(auditLogger.events.some((event) => event.action === 'INVOICE_DELETED')).toBe(true);
    });

    it('returns not found when invoice does not exist', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(null);
        const auditLogger = new AuditLoggerSpy();

        const useCase = new SoftDeleteInvoiceUseCase({
            invoiceRepository,
            auditLogger,
            dateProvider: new DateProviderStub(fixedNow),
            ragReindexInvoiceService: new RagReindexInvoiceServiceStub(),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'missing',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvoiceNotFoundError);
        }
        expect(invoiceRepository.updatedInvoice).toBeNull();
    });
});
