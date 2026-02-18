import type { UpdateManualInvoiceRequest } from '@application/dto/update-manual-invoice.request.js';
import type { UpdateManualInvoiceResponse } from '@application/dto/update-manual-invoice.response.js';
import type { InvoiceRepository } from '@application/ports/invoice.repository.js';
import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { PortError } from '@application/errors/port.error.js';
import type { IdGenerator } from '@application/ports/id-generator.js';
import type { RagReindexInvoiceHandler } from '@application/services/rag-reindex-invoice.service.js';
import { InvoiceHeaderStatus, InvoiceStatus } from '@domain/entities/invoice.entity.js';
import { createMovementsFromInput, mapInvoiceToDetailDto } from '@application/shared/movement-mappers.js';
import { DataSource } from '@domain/enums/data-source.enum.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import { InvalidInvoiceStatusError } from '@domain/errors/invalid-invoice-status.error.js';
import { InvalidInvoiceTotalsError } from '@domain/errors/invalid-invoice-totals.error.js';
import { InvoiceDate } from '@domain/value-objects/invoice-date.value-object.js';
import { Money } from '@domain/value-objects/money.value-object.js';
import { ok, fail, type Result } from '@shared/result.js';

export type UpdateManualInvoiceDependencies = {
    invoiceRepository: InvoiceRepository;
    invoiceMovementIdGenerator: IdGenerator;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
    ragReindexInvoiceService: RagReindexInvoiceHandler;
};

export type UpdateManualInvoiceError = InvoiceNotFoundError | InvalidInvoiceStatusError | InvalidInvoiceTotalsError | PortError;

export class UpdateManualInvoiceUseCase {
    constructor(private readonly dependencies: UpdateManualInvoiceDependencies) {}

    async execute(
        request: UpdateManualInvoiceRequest,
    ): Promise<Result<UpdateManualInvoiceResponse, UpdateManualInvoiceError>> {
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

        const movements = createMovementsFromInput(
            request.invoice.movements,
            () => this.dependencies.invoiceMovementIdGenerator.generate(),
        );

        const updated = invoice.updateDetails({
            ...(request.invoice.numeroFactura === undefined ? {} : { numeroFactura: request.invoice.numeroFactura }),
            ...(request.invoice.fechaOperacion === undefined
                ? {}
                : { fechaOperacion: InvoiceDate.create(request.invoice.fechaOperacion) }),
            ...(request.invoice.fechaVencimiento === undefined
                ? {}
                : { fechaVencimiento: InvoiceDate.create(request.invoice.fechaVencimiento) }),
            ...(request.invoice.baseImponible === undefined
                ? {}
                : { baseImponible: Money.create(request.invoice.baseImponible) }),
            ...(request.invoice.iva === undefined ? {} : { iva: Money.create(request.invoice.iva) }),
            ...(request.invoice.total === undefined ? {} : { total: Money.create(request.invoice.total) }),
            headerSource: DataSource.Manual,
            headerStatus: InvoiceHeaderStatus.Confirmed,
            movements,
            updatedAt: now,
        });

        if (!updated.isTotalsConsistent()) {
            return fail(new InvalidInvoiceTotalsError());
        }

        const updateResult = await this.dependencies.invoiceRepository.update(updated);
        if (!updateResult.success) {
            return fail(updateResult.error);
        }

        const auditResult = await this.dependencies.auditLogger.log({
            action: 'INVOICE_MANUAL_UPDATED',
            actorUserId: request.actorUserId,
            targetUserId: updated.id,
            metadata: {
                invoiceId: updated.id,
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

        return ok(mapInvoiceToDetailDto(updated));
    }
}
