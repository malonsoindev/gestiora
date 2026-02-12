import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { InvoiceRepository } from '../ports/invoice.repository.js';
import type { PortError } from '../errors/port.error.js';
import type { RagReindexInvoiceHandler } from '../services/rag-reindex-invoice.service.js';
import type { ConfirmInvoiceMovementsRequest } from '../dto/confirm-invoice-movements.request.js';
import type { ConfirmInvoiceMovementsResponse } from '../dto/confirm-invoice-movements.response.js';
import { InvoiceMovement, InvoiceMovementSource, InvoiceMovementStatus } from '../../domain/entities/invoice-movement.entity.js';
import { InvoiceNotFoundError } from '../../domain/errors/invoice-not-found.error.js';
import { InvalidInvoiceStatusError } from '../../domain/errors/invalid-invoice-status.error.js';
import { ok, fail, type Result } from '../../shared/result.js';


export type ConfirmInvoiceMovementsDependencies = {
    invoiceRepository: InvoiceRepository;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
    ragReindexInvoiceService: RagReindexInvoiceHandler;
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
        const updatedMovements = invoice.movements.map((movement) =>
            this.processMovementUpdate(movement, movementUpdates.get(movement.id)),
        );

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

        const reindexResult = await this.dependencies.ragReindexInvoiceService.reindex(updated.id);
        if (!reindexResult.success) {
            return fail(reindexResult.error);
        }

        return ok({ invoiceId: updated.id });
    }

    private processMovementUpdate(
        movement: InvoiceMovement,
        update: ConfirmInvoiceMovementsRequest['movements'][number] | undefined,
    ): InvoiceMovement {
        if (!update) {
            return movement;
        }

        const statusMap: Record<'CONFIRM' | 'REJECT' | 'CORRECT', InvoiceMovementStatus> = {
            CONFIRM: InvoiceMovementStatus.Confirmed,
            REJECT: InvoiceMovementStatus.Rejected,
            CORRECT: InvoiceMovementStatus.Confirmed,
        };

        const isCorrection = update.action === 'CORRECT';

        return InvoiceMovement.create({
            id: movement.id,
            concepto: isCorrection ? (update.concepto ?? movement.concepto) : movement.concepto,
            cantidad: isCorrection ? (update.cantidad ?? movement.cantidad) : movement.cantidad,
            precio: isCorrection ? (update.precio ?? movement.precio) : movement.precio,
            ...this.resolveOptionalField('baseImponible', movement.baseImponible, isCorrection ? update.baseImponible : undefined),
            ...this.resolveOptionalField('iva', movement.iva, isCorrection ? update.iva : undefined),
            total: isCorrection ? (update.total ?? movement.total) : movement.total,
            source: isCorrection ? InvoiceMovementSource.Manual : movement.source,
            status: statusMap[update.action],
        });
    }

    private resolveOptionalField<K extends string, V>(
        key: K,
        currentValue: V | undefined,
        updateValue: V | undefined,
    ): Record<K, V> | Record<string, never> {
        if (updateValue !== undefined) {
            return { [key]: updateValue } as Record<K, V>;
        }
        if (currentValue !== undefined) {
            return { [key]: currentValue } as Record<K, V>;
        }
        return {} as Record<string, never>;
    }
}
