import { describe, expect, it } from 'vitest';
import { UpdateManualInvoiceUseCase } from '../../../src/application/use-cases/update-manual-invoice.use-case.js';
import { Invoice, InvoiceStatus } from '../../../src/domain/entities/invoice.entity.js';
import type { InvoiceProps } from '../../../src/domain/entities/invoice.entity.js';
import { InvoiceMovement } from '../../../src/domain/entities/invoice-movement.entity.js';
import { InvoiceDate } from '../../../src/domain/value-objects/invoice-date.value-object.js';
import { Money } from '../../../src/domain/value-objects/money.value-object.js';
import { InvoiceNotFoundError } from '../../../src/domain/errors/invoice-not-found.error.js';
import { InvalidInvoiceStatusError } from '../../../src/domain/errors/invalid-invoice-status.error.js';
import { InvalidInvoiceTotalsError } from '../../../src/domain/errors/invalid-invoice-totals.error.js';
import { RagReindexInvoiceServiceStub } from '../stubs/rag-reindex-invoice.service.stub.js';
import { DateProviderStub } from '../../shared/stubs/date-provider.stub.js';
import { InvoiceMovementIdGeneratorStub } from '../../shared/stubs/invoice-movement-id-generator.stub.js';
import { InvoiceRepositoryStub } from '../../shared/stubs/invoice-repository.stub.js';
import { AuditLoggerSpy } from '../../shared/spies/audit-logger.spy.js';
import { fixedNow } from '../../shared/fixed-now.js';

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

const simpleMovementInput = {
    concepto: 'Servicio',
    cantidad: 1,
    precio: 100,
    total: 100,
};

const updatedMovementInput = {
    concepto: 'Servicio actualizado',
    cantidad: 1,
    precio: 200,
    baseImponible: 200,
    iva: 42,
    total: 242,
};

const updatedInvoiceInput = {
    numeroFactura: 'FAC-2026-0002',
    fechaOperacion: '2026-02-12',
    baseImponible: 200,
    iva: 42,
    total: 242,
    movements: [updatedMovementInput],
};

const invalidTotalsInvoiceInput = {
    baseImponible: 200,
    iva: 42,
    total: 999,
    movements: [updatedMovementInput],
};

const invalidMovementTotalsInput = {
    baseImponible: 200,
    iva: 42,
    total: 242,
    movements: [{ ...updatedMovementInput, total: 999 }],
};

type SutOverrides = Partial<{
    invoice: Invoice | null;
    now: Date;
    movementIds: string[];
}>;

const makeSut = (overrides: SutOverrides = {}) => {
    const now = overrides.now ?? fixedNow;
    const invoice = overrides.invoice === undefined ? createInvoice() : overrides.invoice;
    const invoiceRepository = new InvoiceRepositoryStub(invoice);
    const auditLogger = new AuditLoggerSpy();
    const invoiceMovementIdGenerator = new InvoiceMovementIdGeneratorStub(overrides.movementIds ?? ['movement-2']);

    const useCase = new UpdateManualInvoiceUseCase({
        invoiceRepository,
        auditLogger,
        dateProvider: new DateProviderStub(now),
        invoiceMovementIdGenerator,
        ragReindexInvoiceService: new RagReindexInvoiceServiceStub(),
    });

    return { useCase, invoiceRepository, auditLogger };
};

describe('UpdateManualInvoiceUseCase', () => {
    it('updates invoice header and movements', async () => {
        const { useCase, invoiceRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
            invoice: updatedInvoiceInput,
        });

        expect(result.success).toBe(true);
        expect(invoiceRepository.updatedInvoice?.numeroFactura).toBe('FAC-2026-0002');
        expect(invoiceRepository.updatedInvoice?.movements).toHaveLength(1);
        expect(auditLogger.events.some((event) => event.action === 'INVOICE_MANUAL_UPDATED')).toBe(true);
    });

    it('rejects when invoice does not exist', async () => {
        const { useCase, invoiceRepository, auditLogger } = makeSut({ invoice: null });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'missing-invoice',
            invoice: {
                total: 100,
                movements: [simpleMovementInput],
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
        const { useCase, invoiceRepository, auditLogger } = makeSut({
            invoice: createInvoice({
                status: InvoiceStatus.Deleted,
                deletedAt: new Date('2026-02-12T10:00:00.000Z'),
            }),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
            invoice: {
                total: 100,
                movements: [simpleMovementInput],
            },
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidInvoiceStatusError);
        }
        expect(invoiceRepository.updatedInvoice).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects when totals do not match movements', async () => {
        const { useCase, invoiceRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
            invoice: invalidTotalsInvoiceInput,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidInvoiceTotalsError);
        }
        expect(invoiceRepository.updatedInvoice).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects when movement total does not match base plus iva', async () => {
        const { useCase, invoiceRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
            invoice: invalidMovementTotalsInput,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidInvoiceTotalsError);
        }
        expect(invoiceRepository.updatedInvoice).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });
});
