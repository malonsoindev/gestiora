import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { FileStorage } from '@application/ports/file-storage.js';
import type { InvoiceExtractionAgent } from '@application/ports/invoice-extraction-agent.js';
import type { IdGenerator } from '@application/ports/id-generator.js';
import type { InvoiceRepository } from '@application/ports/invoice.repository.js';
import type { PortError } from '@application/errors/port.error.js';
import type { RagReindexInvoiceHandler } from '@application/services/rag-reindex-invoice.service.js';
import type { ReprocessInvoiceExtractionRequest } from '@application/dto/reprocess-invoice-extraction.request.js';
import type { ReprocessInvoiceExtractionResponse } from '@application/dto/reprocess-invoice-extraction.response.js';
import {
    InvoiceHeaderStatus,
    InvoiceStatus,
} from '@domain/entities/invoice.entity.js';
import { InvoiceMovementStatus } from '@domain/entities/invoice-movement.entity.js';
import { DataSource } from '@domain/enums/data-source.enum.js';
import { createMovementsFromInput } from '@application/shared/movement-mappers.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import { InvalidInvoiceStatusError } from '@domain/errors/invalid-invoice-status.error.js';
import { InvoiceDate } from '@domain/value-objects/invoice-date.value-object.js';
import { Money } from '@domain/value-objects/money.value-object.js';
import { ok, fail, type Result } from '@shared/result.js';


export type ReprocessInvoiceExtractionDependencies = {
    invoiceRepository: InvoiceRepository;
    fileStorage: FileStorage;
    extractionAgent: InvoiceExtractionAgent;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
    invoiceMovementIdGenerator: IdGenerator;
    ragReindexInvoiceService: RagReindexInvoiceHandler;
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

        const manualMovements = invoice.movements.filter((movement) => movement.source === DataSource.Manual);
        const aiMovements = createMovementsFromInput(
            extracted.invoice.movements,
            () => this.dependencies.invoiceMovementIdGenerator.generate(),
            { source: DataSource.Ai, status: InvoiceMovementStatus.Proposed },
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

        const reindexResult = await this.dependencies.ragReindexInvoiceService.reindex(updated.id);
        if (!reindexResult.success) {
            return fail(reindexResult.error);
        }

        return ok({ invoiceId: updated.id });
    }

    private buildHeaderUpdates(
        invoice: { headerSource: DataSource; headerStatus: InvoiceHeaderStatus },
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
        headerSource: DataSource;
        headerStatus: InvoiceHeaderStatus;
    }> {
        const isManuallyConfirmed =
            invoice.headerSource === DataSource.Manual &&
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
            headerSource: DataSource.Ai,
            headerStatus: InvoiceHeaderStatus.Proposed,
        };
    }
}
