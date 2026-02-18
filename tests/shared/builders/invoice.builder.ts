import { Invoice, InvoiceStatus, InvoiceHeaderStatus } from '@domain/entities/invoice.entity.js';
import type { InvoiceProps } from '@domain/entities/invoice.entity.js';
import { InvoiceMovement, InvoiceMovementStatus } from '@domain/entities/invoice-movement.entity.js';
import type { InvoiceMovementProps } from '@domain/entities/invoice-movement.entity.js';
import { DataSource } from '@domain/enums/data-source.enum.js';
import { InvoiceDate } from '@domain/value-objects/invoice-date.value-object.js';
import { Money } from '@domain/value-objects/money.value-object.js';
import { FileRef } from '@domain/value-objects/file-ref.value-object.js';

export const FIXED_NOW = new Date('2026-03-10T10:00:00.000Z');

export interface InvoiceMovementBuilderOverrides {
    id?: string;
    concepto?: string;
    cantidad?: number;
    precio?: number;
    baseImponible?: number;
    iva?: number;
    total?: number;
    source?: DataSource;
    status?: InvoiceMovementStatus;
}

/**
 * Creates a test InvoiceMovement with sensible defaults.
 */
export function createTestMovement(overrides: InvoiceMovementBuilderOverrides = {}): InvoiceMovement {
    return InvoiceMovement.create({
        id: overrides.id ?? 'movement-1',
        concepto: overrides.concepto ?? 'Servicio',
        cantidad: overrides.cantidad ?? 1,
        precio: overrides.precio ?? 100,
        baseImponible: overrides.baseImponible ?? 100,
        iva: overrides.iva ?? 21,
        total: overrides.total ?? 121,
        source: overrides.source ?? DataSource.Ai,
        status: overrides.status ?? InvoiceMovementStatus.Proposed,
    });
}

export interface InvoiceBuilderOverrides {
    id?: string;
    providerId?: string;
    status?: InvoiceStatus;
    headerSource?: DataSource;
    headerStatus?: InvoiceHeaderStatus;
    numeroFactura?: string;
    fechaOperacion?: string;
    fechaVencimiento?: string;
    baseImponible?: number;
    iva?: number;
    total?: number;
    movements?: InvoiceMovement[];
    withFileRef?: boolean;
    fileRef?: FileRef;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}

/**
 * Creates a test Invoice entity with sensible defaults.
 */
export function createTestInvoice(overrides: InvoiceBuilderOverrides = {}): Invoice {
    const invoiceId = overrides.id ?? 'invoice-1';
    const defaultMovement = createTestMovement({ id: `${invoiceId}-movement-1` });
    const movements = overrides.movements ?? [defaultMovement];
    const withFileRef = overrides.withFileRef ?? true;

    const props: InvoiceProps = {
        id: invoiceId,
        providerId: overrides.providerId ?? 'provider-1',
        status: overrides.status ?? InvoiceStatus.Active,
        headerSource: overrides.headerSource ?? DataSource.Ai,
        headerStatus: overrides.headerStatus ?? InvoiceHeaderStatus.Proposed,
        numeroFactura: overrides.numeroFactura ?? 'FAC-2026-0010',
        fechaOperacion: InvoiceDate.create(overrides.fechaOperacion ?? '2026-03-01'),
        fechaVencimiento: InvoiceDate.create(overrides.fechaVencimiento ?? '2026-03-31'),
        baseImponible: Money.create(overrides.baseImponible ?? 100),
        iva: Money.create(overrides.iva ?? 21),
        total: Money.create(overrides.total ?? 121),
        movements,
        createdAt: overrides.createdAt ?? FIXED_NOW,
        updatedAt: overrides.updatedAt ?? FIXED_NOW,
    };

    if (overrides.deletedAt !== undefined) {
        props.deletedAt = overrides.deletedAt;
    }

    if (overrides.fileRef !== undefined) {
        props.fileRef = overrides.fileRef;
    } else if (withFileRef) {
        props.fileRef = FileRef.create({
            storageKey: `storage/${invoiceId}.pdf`,
            filename: `${invoiceId}.pdf`,
            mimeType: 'application/pdf',
            sizeBytes: 10,
            checksum: `checksum-${invoiceId}`,
        });
    }

    return Invoice.create(props);
}

/**
 * Generates unique test IDs with a given prefix.
 */
export function createTestInvoiceIds(prefix: string) {
    return {
        one: `${prefix}-inv-1`,
        two: `${prefix}-inv-2`,
        three: `${prefix}-inv-3`,
    };
}
