import { describe, expect, it } from 'vitest';
import { InMemoryInvoiceRepository } from '@infrastructure/persistence/in-memory/in-memory-invoice.repository.js';
import { Invoice, InvoiceStatus } from '@domain/entities/invoice.entity.js';
import type { InvoiceProps } from '@domain/entities/invoice.entity.js';
import { InvoiceMovement } from '@domain/entities/invoice-movement.entity.js';
import type { InvoiceMovementProps } from '@domain/entities/invoice-movement.entity.js';
import { InvoiceDate } from '@domain/value-objects/invoice-date.value-object.js';
import { Money } from '@domain/value-objects/money.value-object.js';

const fixedNow = new Date('2026-02-12T10:00:00.000Z');

const createMovement = (overrides: Partial<InvoiceMovementProps> = {}): InvoiceMovement =>
    InvoiceMovement.create({
        id: 'movement-1',
        concepto: 'Servicio',
        cantidad: 1,
        precio: 100,
        baseImponible: 100,
        iva: 21,
        total: 121,
        ...overrides,
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
        movements: [createMovement()],
        createdAt: fixedNow,
        updatedAt: fixedNow,
        ...overrides,
    });

describe('InMemoryInvoiceRepository', () => {
    it('stores invoices on create and returns them by id', async () => {
        const repository = new InMemoryInvoiceRepository();
        const invoice = createInvoice();

        const createResult = await repository.create(invoice);
        const findResult = await repository.findById(invoice.id);

        expect(createResult.success).toBe(true);
        expect(findResult.success).toBe(true);
        if (findResult.success) {
            expect(findResult.value?.id).toBe('invoice-1');
        }
    });

    it('returns null when invoice does not exist', async () => {
        const repository = new InMemoryInvoiceRepository();

        const result = await repository.findById('missing-invoice');

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value).toBeNull();
        }
    });
});
