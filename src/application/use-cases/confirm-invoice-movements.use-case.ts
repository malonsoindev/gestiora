import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { InvoiceRepository } from '../ports/invoice.repository.js';
import type { PortError } from '../errors/port.error.js';
import { InvoiceMovement, InvoiceMovementSource, InvoiceMovementStatus } from '../../domain/entities/invoice-movement.entity.js';
import { InvoiceNotFoundError } from '../../domain/errors/invoice-not-found.error.js';
import { InvalidInvoiceStatusError } from '../../domain/errors/invalid-invoice-status.error.js';
import { ok, fail, type Result } from '../../shared/result.js';

export type ConfirmInvoiceMovementsRequest = {
    actorUserId: string;
    invoiceId: string;
    movements: Array<{
        id: string;
        action: 'CONFIRM' | 'CORRECT' | 'REJECT';
        concepto?: string;
        cantidad?: number;
        precio?: number;
        baseImponible?: number;
        iva?: number;
        total?: number;
    }>;
};

export type ConfirmInvoiceMovementsResponse = {
    invoiceId: string;
};

export type ConfirmInvoiceMovementsDependencies = {
    invoiceRepository: InvoiceRepository;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
};

export type ConfirmInvoiceMovementsError =
    | InvoiceNotFoundError
    | InvalidInvoiceStatusError
    | PortError;

export class ConfirmInvoiceMovementsUseCase {
    constructor(private readonly dependencies: ConfirmInvoiceMovementsDependencies) {}

    async execute(
        request: ConfirmInvoiceMovementsRequest,
    ): Promise<Result<ConfirmInvoiceMovementsResponse, ConfirmInvoiceMovementsError>> {
        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }
        const now = nowResult.value;

        const invoiceResult = await this.dependencies.invoiceRepository.findById(request.invoiceId);
        if (!invoiceResult.success) {
            return fail(invoiceResult.error);
        }
        const invoice = invoiceResult.value;
        if (!invoice) {
            return fail(new InvoiceNotFoundError());
        }
        if (invoice.status === 'DELETED') {
            return fail(new InvalidInvoiceStatusError());
        }

        const movementUpdates = new Map(request.movements.map((movement) => [movement.id, movement]));
        const updatedMovements = invoice.movements.map((movement) => {
            const update = movementUpdates.get(movement.id);
            if (!update) {
                return movement;
            }

            if (update.action === 'CONFIRM') {
                return InvoiceMovement.create({
                    id: movement.id,
                    concepto: movement.concepto,
                    cantidad: movement.cantidad,
                    precio: movement.precio,
                    ...(movement.baseImponible === undefined ? {} : { baseImponible: movement.baseImponible }),
                    ...(movement.iva === undefined ? {} : { iva: movement.iva }),
                    total: movement.total,
                    source: movement.source,
                    status: InvoiceMovementStatus.Confirmed,
                });
            }

            if (update.action === 'REJECT') {
                return InvoiceMovement.create({
                    id: movement.id,
                    concepto: movement.concepto,
                    cantidad: movement.cantidad,
                    precio: movement.precio,
                    ...(movement.baseImponible === undefined ? {} : { baseImponible: movement.baseImponible }),
                    ...(movement.iva === undefined ? {} : { iva: movement.iva }),
                    total: movement.total,
                    source: movement.source,
                    status: InvoiceMovementStatus.Rejected,
                });
            }

            if (update.action === 'CORRECT') {
                return InvoiceMovement.create({
                    id: movement.id,
                    concepto: update.concepto ?? movement.concepto,
                    cantidad: update.cantidad ?? movement.cantidad,
                    precio: update.precio ?? movement.precio,
                    ...(update.baseImponible === undefined
                        ? movement.baseImponible === undefined
                            ? {}
                            : { baseImponible: movement.baseImponible }
                        : { baseImponible: update.baseImponible }),
                    ...(update.iva === undefined
                        ? movement.iva === undefined
                            ? {}
                            : { iva: movement.iva }
                        : { iva: update.iva }),
                    total: update.total ?? movement.total,
                    source: InvoiceMovementSource.Manual,
                    status: InvoiceMovementStatus.Confirmed,
                });
            }

            return movement;
        });

        const updated = invoice.updateDetails({
            movements: updatedMovements,
            updatedAt: now,
        });

        const updateResult = await this.dependencies.invoiceRepository.update(updated);
        if (!updateResult.success) {
            return fail(updateResult.error);
        }

        const auditResult = await this.dependencies.auditLogger.log({
            action: 'INVOICE_MOVEMENTS_CONFIRMED',
            actorUserId: request.actorUserId,
            targetUserId: updated.id,
            metadata: {
                invoiceId: updated.id,
                movements: JSON.stringify(
                    request.movements.map((movement) => ({
                        id: movement.id,
                        action: movement.action,
                    })),
                ),
            },
            createdAt: now,
        });
        if (!auditResult.success) {
            return fail(auditResult.error);
        }

        return ok({ invoiceId: updated.id });
    }
}
