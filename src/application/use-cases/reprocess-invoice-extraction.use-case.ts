import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { FileStorage } from '../ports/file-storage.js';
import type { InvoiceExtractionAgent } from '../ports/invoice-extraction-agent.js';
import type { InvoiceMovementIdGenerator } from '../ports/invoice-movement-id-generator.js';
import type { InvoiceRepository } from '../ports/invoice.repository.js';
import type { PortError } from '../errors/port.error.js';
import type { ReprocessInvoiceExtractionRequest } from '../dto/reprocess-invoice-extraction.request.js';
import type { ReprocessInvoiceExtractionResponse } from '../dto/reprocess-invoice-extraction.response.js';
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
import { InvoiceDate } from '../../domain/value-objects/invoice-date.value-object.js';
import { Money } from '../../domain/value-objects/money.value-object.js';
import { ok, fail, type Result } from '../../shared/result.js';


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

        const headerUpdates = this.buildHeaderUpdates(invoice, extracted);

        const manualMovements = invoice.movements.filter((movement) => movement.source === InvoiceMovementSource.Manual);
        const aiMovements = this.createAiMovements(extracted.invoice.movements);

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

    private buildHeaderUpdates(
        invoice: { headerSource: InvoiceHeaderSource; headerStatus: InvoiceHeaderStatus },
        extracted: { invoice: {
            numeroFactura?: string;
            fechaOperacion?: string;
            fechaVencimiento?: string;
            baseImponible?: number;
            iva?: number;
            total?: number;
        } },
    ): Partial<{
        numeroFactura: string;
        fechaOperacion: InvoiceDate;
        fechaVencimiento: InvoiceDate;
        baseImponible: Money;
        iva: Money;
        total: Money;
        headerSource: InvoiceHeaderSource;
        headerStatus: InvoiceHeaderStatus;
    }> {
        const isManuallyConfirmed =
            invoice.headerSource === InvoiceHeaderSource.Manual &&
            invoice.headerStatus === InvoiceHeaderStatus.Confirmed;

        if (isManuallyConfirmed) {
            return {};
        }

        const ext = extracted.invoice;
        return {
            ...(ext.numeroFactura && { numeroFactura: ext.numeroFactura }),
            ...(ext.fechaOperacion && { fechaOperacion: InvoiceDate.create(ext.fechaOperacion) }),
            ...(ext.fechaVencimiento && { fechaVencimiento: InvoiceDate.create(ext.fechaVencimiento) }),
            ...(ext.baseImponible !== undefined && { baseImponible: Money.create(ext.baseImponible) }),
            ...(ext.iva !== undefined && { iva: Money.create(ext.iva) }),
            ...(ext.total !== undefined && { total: Money.create(ext.total) }),
            headerSource: InvoiceHeaderSource.Ai,
            headerStatus: InvoiceHeaderStatus.Proposed,
        };
    }

    private createAiMovements(
        movements: Array<{
            concepto: string;
            cantidad: number;
            precio: number;
            baseImponible?: number;
            iva?: number;
            total: number;
        }>,
    ): InvoiceMovement[] {
        return movements.map((movement) =>
            InvoiceMovement.create({
                id: this.dependencies.invoiceMovementIdGenerator.generate(),
                concepto: movement.concepto,
                cantidad: movement.cantidad,
                precio: movement.precio,
                ...(movement.baseImponible !== undefined && { baseImponible: movement.baseImponible }),
                ...(movement.iva !== undefined && { iva: movement.iva }),
                total: movement.total,
                source: InvoiceMovementSource.Ai,
                status: InvoiceMovementStatus.Proposed,
            }),
        );
    }
}
