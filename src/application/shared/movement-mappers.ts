import { InvoiceMovement, InvoiceMovementStatus } from '@domain/entities/invoice-movement.entity.js';
import { DataSource } from '@domain/enums/data-source.enum.js';

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
