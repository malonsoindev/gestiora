import { Invoice, InvoiceStatus } from '@domain/entities/invoice.entity.js';
import type { InvoiceProps } from '@domain/entities/invoice.entity.js';
import { InvoiceMovement } from '@domain/entities/invoice-movement.entity.js';
import { InvoiceDate } from '@domain/value-objects/invoice-date.value-object.js';
import { Money } from '@domain/value-objects/money.value-object.js';

type CreateInvoiceParams = {
    now: Date;
    overrides?: Partial<InvoiceProps>;
};

const createDefaultMovement = () =>
    InvoiceMovement.create({
        id: 'movement-1',
        concepto: 'Servicio',
        cantidad: 1,
        precio: 100,
        baseImponible: 100,
        iva: 21,
        total: 121,
    });

export const createTestInvoice = ({ now, overrides }: CreateInvoiceParams): Invoice => {
    const resolvedOverrides = overrides ?? {};
    const { movements, ...restOverrides } = resolvedOverrides;

    return Invoice.create({
        id: 'invoice-1',
        providerId: 'provider-1',
        status: InvoiceStatus.Draft,
        numeroFactura: 'FAC-2026-0001',
        fechaOperacion: InvoiceDate.create('2026-02-10'),
        fechaVencimiento: InvoiceDate.create('2026-03-10'),
        baseImponible: Money.create(100),
        iva: Money.create(21),
        total: Money.create(121),
        movements: movements ?? [createDefaultMovement()],
        createdAt: now,
        updatedAt: now,
        ...restOverrides,
    });
};
