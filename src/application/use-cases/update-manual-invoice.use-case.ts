import type { UpdateManualInvoiceRequest } from '@application/dto/update-manual-invoice.request.js';
import type { UpdateManualInvoiceResponse } from '@application/dto/update-manual-invoice.response.js';
import type { InvoiceRepository } from '@application/ports/invoice.repository.js';
import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { PortError } from '@application/errors/port.error.js';
import type { InvoiceMovementIdGenerator } from '@application/ports/invoice-movement-id-generator.js';
import type { RagReindexInvoiceHandler } from '@application/services/rag-reindex-invoice.service.js';
import type { Invoice } from '@domain/entities/invoice.entity.js';
import { InvoiceHeaderSource, InvoiceHeaderStatus, InvoiceStatus } from '@domain/entities/invoice.entity.js';
import { InvoiceMovement } from '@domain/entities/invoice-movement.entity.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import { InvalidInvoiceStatusError } from '@domain/errors/invalid-invoice-status.error.js';
import { InvalidInvoiceTotalsError } from '@domain/errors/invalid-invoice-totals.error.js';
import { InvoiceDate } from '@domain/value-objects/invoice-date.value-object.js';
import { Money } from '@domain/value-objects/money.value-object.js';
import { ok, fail, type Result } from '@shared/result.js';

export type UpdateManualInvoiceDependencies = {
    invoiceRepository: InvoiceRepository;
    invoiceMovementIdGenerator: InvoiceMovementIdGenerator;
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

        const movements = request.invoice.movements.map((movement) =>
            InvoiceMovement.create({
                id: this.dependencies.invoiceMovementIdGenerator.generate(),
                concepto: movement.concepto,
                cantidad: movement.cantidad,
                precio: movement.precio,
                ...(movement.baseImponible === undefined ? {} : { baseImponible: movement.baseImponible }),
                ...(movement.iva === undefined ? {} : { iva: movement.iva }),
                total: movement.total,
            }),
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
            headerSource: InvoiceHeaderSource.Manual,
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

        return ok(this.mapResponse(updated));
    }


    private mapResponse(invoice: Invoice): UpdateManualInvoiceResponse {
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
            movements: invoice.movements.map((movement) => ({
                id: movement.id,
                concepto: movement.concepto,
                cantidad: movement.cantidad,
                precio: movement.precio,
                ...(movement.baseImponible === undefined ? {} : { baseImponible: movement.baseImponible }),
                ...(movement.iva === undefined ? {} : { iva: movement.iva }),
                total: movement.total,
                source: movement.source,
                status: movement.status,
            })),
        };
    }
}
