import { InvoiceMovement, InvoiceMovementStatus } from '@domain/entities/invoice-movement.entity.js';
import { DataSource } from '@domain/enums/data-source.enum.js';
import type { Invoice } from '@domain/entities/invoice.entity.js';

/**
 * Input shape for creating an InvoiceMovement from external data (request/extraction).
 */
export type MovementInput = {
    concepto: string;
    cantidad: number;
    precio: number;
    baseImponible?: number;
    iva?: number;
    total: number;
};

/**
 * Output shape for movement DTOs in responses.
 */
export type MovementDto = {
    id: string;
    concepto: string;
    cantidad: number;
    precio: number;
    baseImponible?: number;
    iva?: number;
    total: number;
    source: 'MANUAL' | 'AI';
    status: 'PROPOSED' | 'CONFIRMED' | 'REJECTED';
};

/**
 * Options for creating movements from input data.
 */
export type CreateMovementsOptions = {
    source?: DataSource;
    status?: InvoiceMovementStatus;
};

/**
 * Creates InvoiceMovement entities from input data.
 *
 * @param movements - Array of movement input data
 * @param idGenerator - Function to generate movement IDs
 * @param options - Optional source and status overrides
 * @returns Array of InvoiceMovement entities
 */
export function createMovementsFromInput(
    movements: MovementInput[],
    idGenerator: () => string,
    options: CreateMovementsOptions = {},
): InvoiceMovement[] {
    return movements.map((movement) =>
        InvoiceMovement.create({
            id: idGenerator(),
            concepto: movement.concepto,
            cantidad: movement.cantidad,
            precio: movement.precio,
            ...(movement.baseImponible !== undefined && { baseImponible: movement.baseImponible }),
            ...(movement.iva !== undefined && { iva: movement.iva }),
            total: movement.total,
            ...(options.source !== undefined && { source: options.source }),
            ...(options.status !== undefined && { status: options.status }),
        }),
    );
}

/**
 * Maps InvoiceMovement entities to DTO format for API responses.
 *
 * @param movements - Array of InvoiceMovement entities
 * @returns Array of movement DTOs
 */
export function mapMovementsToDto(movements: InvoiceMovement[]): MovementDto[] {
    return movements.map((movement) => ({
        id: movement.id,
        concepto: movement.concepto,
        cantidad: movement.cantidad,
        precio: movement.precio,
        ...(movement.baseImponible !== undefined && { baseImponible: movement.baseImponible }),
        ...(movement.iva !== undefined && { iva: movement.iva }),
        total: movement.total,
        source: movement.source,
        status: movement.status,
    }));
}

/**
 * Output shape for invoice detail DTOs in responses.
 */
export type InvoiceDetailDto = {
    invoiceId: string;
    providerId: string;
    status: 'DRAFT' | 'ACTIVE' | 'INCONSISTENT' | 'DELETED';
    fileRef?: {
        storageKey: string;
        filename: string;
        mimeType: string;
        sizeBytes: number;
        checksum: string;
    };
    numeroFactura?: string;
    fechaOperacion?: string;
    fechaVencimiento?: string;
    baseImponible?: number;
    iva?: number;
    total?: number;
    headerSource: 'MANUAL' | 'AI';
    headerStatus: 'PROPOSED' | 'CONFIRMED';
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    movements: MovementDto[];
};

/**
 * Maps an Invoice entity to a detail DTO for API responses.
 *
 * @param invoice - The Invoice entity to map
 * @returns Invoice detail DTO
 */
export function mapInvoiceToDetailDto(invoice: Invoice): InvoiceDetailDto {
    return {
        invoiceId: invoice.id,
        providerId: invoice.providerId,
        status: invoice.status,
        ...(invoice.fileRef === undefined
            ? {}
            : {
                  fileRef: {
                      storageKey: invoice.fileRef.storageKey,
                      filename: invoice.fileRef.filename,
                      mimeType: invoice.fileRef.mimeType,
                      sizeBytes: invoice.fileRef.sizeBytes,
                      checksum: invoice.fileRef.checksum,
                  },
              }),
        ...(invoice.numeroFactura === undefined ? {} : { numeroFactura: invoice.numeroFactura }),
        ...(invoice.fechaOperacion === undefined ? {} : { fechaOperacion: invoice.fechaOperacion }),
        ...(invoice.fechaVencimiento === undefined ? {} : { fechaVencimiento: invoice.fechaVencimiento }),
        ...(invoice.baseImponible === undefined ? {} : { baseImponible: invoice.baseImponible }),
        ...(invoice.iva === undefined ? {} : { iva: invoice.iva }),
        ...(invoice.total === undefined ? {} : { total: invoice.total }),
        headerSource: invoice.headerSource,
        headerStatus: invoice.headerStatus,
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
        ...(invoice.deletedAt === undefined ? {} : { deletedAt: invoice.deletedAt.toISOString() }),
        movements: mapMovementsToDto(invoice.movements),
    };
}
