import type { FileStorage } from '../ports/file-storage.js';
import type { InvoiceRepository } from '../ports/invoice.repository.js';
import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { PortError } from '../errors/port.error.js';
import type { AttachInvoiceFileResponse } from '../dto/attach-invoice-file.response.js';
import type { Invoice } from '../../domain/entities/invoice.entity.js';
import { InvoiceStatus } from '../../domain/entities/invoice.entity.js';
import { InvoiceNotFoundError } from '../../domain/errors/invoice-not-found.error.js';
import { InvalidInvoiceStatusError } from '../../domain/errors/invalid-invoice-status.error.js';
import { FileRef } from '../../domain/value-objects/file-ref.value-object.js';
import { ok, fail, type Result } from '../../shared/result.js';

export type AttachInvoiceFileRequest = {
    actorUserId: string;
    invoiceId: string;
    file: {
        filename: string;
        mimeType: string;
        sizeBytes: number;
        checksum: string;
        content: Buffer;
    };
};

export type AttachInvoiceFileDependencies = {
    invoiceRepository: InvoiceRepository;
    fileStorage: FileStorage;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
};

export type AttachInvoiceFileError = InvoiceNotFoundError | InvalidInvoiceStatusError | PortError;

export class AttachInvoiceFileUseCase {
    constructor(private readonly dependencies: AttachInvoiceFileDependencies) {}

    async execute(
        request: AttachInvoiceFileRequest,
    ): Promise<Result<AttachInvoiceFileResponse, AttachInvoiceFileError>> {
        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }
        const now = nowResult.value;

        const invoiceResult = await this.loadInvoice(request.invoiceId);
        if (!invoiceResult.success) {
            return fail(invoiceResult.error);
        }
        const invoice = invoiceResult.value;

        const storeResult = await this.dependencies.fileStorage.store(request.file);
        if (!storeResult.success) {
            return fail(storeResult.error);
        }

        const fileRef = FileRef.create(storeResult.value);
        const previousStorageKey = invoice.fileRef?.storageKey;
        const updated = invoice.attachFileRef(fileRef, now);

        const updateResult = await this.dependencies.invoiceRepository.update(updated);
        if (!updateResult.success) {
            return fail(updateResult.error);
        }

        const deleteResult = await this.deletePreviousFile(previousStorageKey);
        if (!deleteResult.success) {
            return fail(deleteResult.error);
        }

        const auditResult = await this.dependencies.auditLogger.log({
            action: 'INVOICE_FILE_ATTACHED',
            actorUserId: request.actorUserId,
            targetUserId: updated.id,
            metadata: {
                invoiceId: updated.id,
                storageKey: fileRef.storageKey,
            },
            createdAt: now,
        });
        if (!auditResult.success) {
            return fail(auditResult.error);
        }

        return ok(this.mapResponse(updated, fileRef));
    }

    private async loadInvoice(invoiceId: string): Promise<Result<Invoice, AttachInvoiceFileError>> {
        const invoiceResult = await this.dependencies.invoiceRepository.findById(invoiceId);
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
        return ok(invoice);
    }

    private async deletePreviousFile(storageKey?: string): Promise<Result<void, PortError>> {
        if (!storageKey) {
            return ok(undefined);
        }
        return this.dependencies.fileStorage.delete(storageKey);
    }

    private mapResponse(updated: Invoice, fileRef: FileRef): AttachInvoiceFileResponse {
        return {
            invoiceId: updated.id,
            providerId: updated.providerId,
            status: updated.status,
            fileRef: {
                storageKey: fileRef.storageKey,
                filename: fileRef.filename,
                mimeType: fileRef.mimeType,
                sizeBytes: fileRef.sizeBytes,
                checksum: fileRef.checksum,
            },
            ...(updated.numeroFactura === undefined ? {} : { numeroFactura: updated.numeroFactura }),
            ...(updated.fechaOperacion === undefined ? {} : { fechaOperacion: updated.fechaOperacion }),
            ...(updated.fechaVencimiento === undefined ? {} : { fechaVencimiento: updated.fechaVencimiento }),
            ...(updated.baseImponible === undefined ? {} : { baseImponible: updated.baseImponible }),
            ...(updated.iva === undefined ? {} : { iva: updated.iva }),
            ...(updated.total === undefined ? {} : { total: updated.total }),
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
            ...(updated.deletedAt === undefined ? {} : { deletedAt: updated.deletedAt.toISOString() }),
            movements: updated.movements.map((movement) => ({
                id: movement.id,
                concepto: movement.concepto,
                cantidad: movement.cantidad,
                precio: movement.precio,
                ...(movement.baseImponible === undefined ? {} : { baseImponible: movement.baseImponible }),
                ...(movement.iva === undefined ? {} : { iva: movement.iva }),
                total: movement.total,
            })),
        };
    }
}
