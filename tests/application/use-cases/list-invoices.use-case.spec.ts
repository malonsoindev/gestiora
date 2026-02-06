import { describe, expect, it } from 'vitest';
import { ListInvoicesUseCase } from '../../../src/application/use-cases/list-invoices.use-case.js';
import type { InvoiceRepository, InvoiceListResult } from '../../../src/application/ports/invoice.repository.js';
import { Invoice, InvoiceStatus } from '../../../src/domain/entities/invoice.entity.js';
import type { InvoiceProps } from '../../../src/domain/entities/invoice.entity.js';
import { InvoiceMovement } from '../../../src/domain/entities/invoice-movement.entity.js';
import { InvoiceDate } from '../../../src/domain/value-objects/invoice-date.value-object.js';
import { Money } from '../../../src/domain/value-objects/money.value-object.js';
import { ok } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-02-20T10:00:00.000Z');

class InvoiceRepositoryStub implements InvoiceRepository {
    constructor(private readonly result: InvoiceListResult) {}

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
        return ok(this.result);
    }

    async getDetail() {
        return ok(null);
    }
}

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

describe('ListInvoicesUseCase', () => {
    it('returns a paginated list of invoices', async () => {
        const invoice = createInvoice();
        const invoiceRepository = new InvoiceRepositoryStub({
            items: [invoice],
            total: 1,
        });

        const useCase = new ListInvoicesUseCase({ invoiceRepository });

        const result = await useCase.execute({ page: 1, pageSize: 20 });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.items).toHaveLength(1);
            expect(result.value.total).toBe(1);
        }
    });
});
