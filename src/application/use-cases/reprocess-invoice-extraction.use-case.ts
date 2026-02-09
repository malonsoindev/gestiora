import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { FileStorage } from '../ports/file-storage.js';
import type { InvoiceExtractionAgent } from '../ports/invoice-extraction-agent.js';
import type { InvoiceMovementIdGenerator } from '../ports/invoice-movement-id-generator.js';
import type { InvoiceRepository } from '../ports/invoice.repository.js';
import type { PortError } from '../errors/port.error.js';
import {
    InvoiceHeaderSource,
    InvoiceHeaderStatus,
    InvoiceStatus,
} from '../../domain/entities/invoice.entity.js';
import {
    InvoiceMovement,
    InvoiceMovementSource,
    InvoiceMovementStatus,
} from '../../domain/entities/invoice-movement.entity.js';
import { InvoiceNotFoundError } from '../../domain/errors/invoice-not-found.error.js';
import { InvalidInvoiceStatusError } from '../../domain/errors/invalid-invoice-status.error.js';
import { FileRef } from '../../domain/value-objects/file-ref.value-object.js';
import { InvoiceDate } from '../../domain/value-objects/invoice-date.value-object.js';
import { Money } from '../../domain/value-objects/money.value-object.js';
import { ok, fail, type Result } from '../../shared/result.js';

export type ReprocessInvoiceExtractionRequest = {
    actorUserId: string;
    invoiceId: string;
};

export type ReprocessInvoiceExtractionResponse = {
    invoiceId: string;
};

export type ReprocessInvoiceExtractionDependencies = {
    invoiceRepository: InvoiceRepository;
    fileStorage: FileStorage;
    extractionAgent: InvoiceExtractionAgent;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
    invoiceMovementIdGenerator: InvoiceMovementIdGenerator;
};

export type ReprocessInvoiceExtractionError =
    | InvoiceNotFoundError
    | InvalidInvoiceStatusError
    | PortError;

export class ReprocessInvoiceExtractionUseCase {
    constructor(private readonly dependencies: ReprocessInvoiceExtractionDependencies) {}

    async execute(
        request: ReprocessInvoiceExtractionRequest,
    ): Promise<Result<ReprocessInvoiceExtractionResponse, ReprocessInvoiceExtractionError>> {
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
        if (invoice.status === InvoiceStatus.Deleted) {
            return fail(new InvalidInvoiceStatusError());
        }
        if (!invoice.fileRef) {
            return fail(new InvalidInvoiceStatusError());
        }

        const fileResult = await this.dependencies.fileStorage.get(invoice.fileRef.storageKey);
        if (!fileResult.success) {
            return fail(fileResult.error);
        }

        const extractionResult = await this.dependencies.extractionAgent.extract({
            filename: fileResult.value.filename,
            mimeType: fileResult.value.mimeType,
            sizeBytes: fileResult.value.sizeBytes,
            checksum: invoice.fileRef.checksum,
            content: fileResult.value.content,
        });
        if (!extractionResult.success) {
            return fail(extractionResult.error);
        }
        const extracted = extractionResult.value;

        const headerUpdates: {
            numeroFactura?: string;
            fechaOperacion?: InvoiceDate;
            fechaVencimiento?: InvoiceDate;
            baseImponible?: Money;
            iva?: Money;
            total?: Money;
            headerSource?: InvoiceHeaderSource;
            headerStatus?: InvoiceHeaderStatus;
        } = {};

        if (invoice.headerSource !== InvoiceHeaderSource.Manual || invoice.headerStatus !== InvoiceHeaderStatus.Confirmed) {
            if (extracted.invoice.numeroFactura) {
                headerUpdates.numeroFactura = extracted.invoice.numeroFactura;
            }
            if (extracted.invoice.fechaOperacion) {
                headerUpdates.fechaOperacion = InvoiceDate.create(extracted.invoice.fechaOperacion);
            }
            if (extracted.invoice.fechaVencimiento) {
                headerUpdates.fechaVencimiento = InvoiceDate.create(extracted.invoice.fechaVencimiento);
            }
            if (extracted.invoice.baseImponible !== undefined) {
                headerUpdates.baseImponible = Money.create(extracted.invoice.baseImponible);
            }
            if (extracted.invoice.iva !== undefined) {
                headerUpdates.iva = Money.create(extracted.invoice.iva);
            }
            if (extracted.invoice.total !== undefined) {
                headerUpdates.total = Money.create(extracted.invoice.total);
            }
            headerUpdates.headerSource = InvoiceHeaderSource.Ai;
            headerUpdates.headerStatus = InvoiceHeaderStatus.Proposed;
        }

        const manualMovements = invoice.movements.filter((movement) => movement.source === InvoiceMovementSource.Manual);
        const aiMovements = extracted.invoice.movements.map((movement) =>
            InvoiceMovement.create({
                id: this.dependencies.invoiceMovementIdGenerator.generate(),
                concepto: movement.concepto,
                cantidad: movement.cantidad,
                precio: movement.precio,
                ...(movement.baseImponible === undefined ? {} : { baseImponible: movement.baseImponible }),
                ...(movement.iva === undefined ? {} : { iva: movement.iva }),
                total: movement.total,
                source: InvoiceMovementSource.Ai,
                status: InvoiceMovementStatus.Proposed,
            }),
        );

        const updated = invoice.updateDetails({
            ...headerUpdates,
            movements: [...manualMovements, ...aiMovements],
            updatedAt: now,
        });

        const updateResult = await this.dependencies.invoiceRepository.update(updated);
        if (!updateResult.success) {
            return fail(updateResult.error);
        }

        const auditResult = await this.dependencies.auditLogger.log({
            action: 'INVOICE_REPROCESSED',
            actorUserId: request.actorUserId,
            targetUserId: updated.id,
            metadata: {
                invoiceId: updated.id,
                fileRef: invoice.fileRef.storageKey,
            },
            createdAt: now,
        });
        if (!auditResult.success) {
            return fail(auditResult.error);
        }

        return ok({ invoiceId: updated.id });
    }
}
