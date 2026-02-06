import { describe, expect, it } from 'vitest';
import { GetInvoiceDetailUseCase } from '../../../src/application/use-cases/get-invoice-detail.use-case.js';
import type { InvoiceRepository } from '../../../src/application/ports/invoice.repository.js';
import { Invoice, InvoiceStatus } from '../../../src/domain/entities/invoice.entity.js';
import type { InvoiceProps } from '../../../src/domain/entities/invoice.entity.js';
import { InvoiceMovement } from '../../../src/domain/entities/invoice-movement.entity.js';
import { InvoiceDate } from '../../../src/domain/value-objects/invoice-date.value-object.js';
import { Money } from '../../../src/domain/value-objects/money.value-object.js';
import { InvoiceNotFoundError } from '../../../src/domain/errors/invoice-not-found.error.js';
import { ok } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-02-21T10:00:00.000Z');

class InvoiceRepositoryStub implements InvoiceRepository {
    constructor(private readonly invoice: Invoice | null) {}

    async create() {
        return ok(undefined);
    }

    async findById() {
        return ok(null);
    }

    async update() {
        return ok(undefined);
    }

    async list() {
        return ok({ items: [], total: 0 });
    }

    async getDetail() {
        return ok(this.invoice);
    }
}

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

describe('GetInvoiceDetailUseCase', () => {
    it('returns invoice detail', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(createInvoice());
        const useCase = new GetInvoiceDetailUseCase({ invoiceRepository });

        const result = await useCase.execute({ invoiceId: 'invoice-1' });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.invoiceId).toBe('invoice-1');
            expect(result.value.providerId).toBe('provider-1');
        }
    });

    it('returns not found when invoice does not exist', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(null);
        const useCase = new GetInvoiceDetailUseCase({ invoiceRepository });

        const result = await useCase.execute({ invoiceId: 'missing' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvoiceNotFoundError);
        }
    });
});
