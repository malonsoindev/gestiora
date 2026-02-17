import { describe, expect, it } from 'vitest';
import { Invoice, InvoiceStatus } from '@domain/entities/invoice.entity.js';
import type { InvoiceProps } from '@domain/entities/invoice.entity.js';
import { InvoiceMovement } from '@domain/entities/invoice-movement.entity.js';
import type { InvoiceMovementProps } from '@domain/entities/invoice-movement.entity.js';
import { FileRef } from '@domain/value-objects/file-ref.value-object.js';
import { InvoiceDate } from '@domain/value-objects/invoice-date.value-object.js';
import { Money } from '@domain/value-objects/money.value-object.js';
import { createTestInvoice } from '@tests/shared/fixtures/invoice.fixture.js';

const baseDate = new Date('2026-02-05T10:00:00.000Z');

const createMovement = (overrides: Partial<InvoiceMovementProps> = {}): InvoiceMovement =>
    InvoiceMovement.create({
        id: 'movement-1',
        concepto: 'Servicio de consultoria',
        cantidad: 2,
        precio: 150,
        baseImponible: 300,
        iva: 63,
        total: 363,
        ...overrides,
    });

const createInvoice = (overrides: Partial<InvoiceProps> = {}): Invoice =>
    createTestInvoice({
        now: baseDate,
        overrides: {
            status: InvoiceStatus.Draft,
            numeroFactura: 'FAC-2026-0001',
            fechaOperacion: InvoiceDate.create('2026-02-04'),
            fechaVencimiento: InvoiceDate.create('2026-03-04'),
            baseImponible: Money.create(300),
            iva: Money.create(63),
            total: Money.create(363),
            movements: [createMovement()],
            ...overrides,
        },
    });

describe('Invoice', () => {
    it('creates a draft invoice without fileRef', () => {
        const invoice = createInvoice();

        expect(invoice.status).toBe(InvoiceStatus.Draft);
        expect(invoice.fileRef).toBeUndefined();
        expect(invoice.numeroFactura).toBe('FAC-2026-0001');
        expect(invoice.movements).toHaveLength(1);
    });

    it('returns a new instance when attaching a fileRef', () => {
        const invoice = createInvoice();
        const now = new Date('2026-02-06T10:00:00.000Z');

        const updated = invoice.attachFileRef(
            FileRef.create({
                storageKey: 'invoices/2026/02/fac-1.pdf',
                filename: 'factura-1.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 1234,
                checksum: 'checksum-1',
            }),
            now,
        );

        expect(updated).not.toBe(invoice);
        expect(updated.fileRef?.storageKey).toBe('invoices/2026/02/fac-1.pdf');
        expect(updated.status).toBe(InvoiceStatus.Active);
        expect(updated.updatedAt).toBe(now);
        expect(updated.createdAt).toBe(invoice.createdAt);
    });

    it('returns a new instance when updating invoice data and movements', () => {
        const invoice = createInvoice();
        const now = new Date('2026-02-07T10:00:00.000Z');
        const movements = [
            createMovement({ id: 'movement-2', concepto: 'Licencia', cantidad: 1, precio: 500, baseImponible: 500, iva: 105, total: 605 }),
        ];

        const updated = invoice.updateDetails({
            numeroFactura: 'FAC-2026-0002',
            fechaOperacion: InvoiceDate.create('2026-02-05'),
            fechaVencimiento: InvoiceDate.create('2026-03-10'),
            baseImponible: Money.create(500),
            iva: Money.create(105),
            total: Money.create(605),
            movements,
            updatedAt: now,
        });

        expect(updated).not.toBe(invoice);
        expect(updated.numeroFactura).toBe('FAC-2026-0002');
        expect(updated.baseImponible).toBe(500);
        expect(updated.movements).toEqual(movements);
        expect(updated.updatedAt).toBe(now);
        expect(updated.createdAt).toBe(invoice.createdAt);
    });

    it('marks the invoice as deleted', () => {
        const invoice = createInvoice();
        const deletedAt = new Date('2026-02-08T10:00:00.000Z');

        const updated = invoice.markDeleted(deletedAt);

        expect(updated.status).toBe(InvoiceStatus.Deleted);
        expect(updated.deletedAt).toBe(deletedAt);
    });
});
