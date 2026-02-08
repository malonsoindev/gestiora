import type { InvoiceExtractionAgent, InvoiceExtractionResult } from '../ports/invoice-extraction-agent.js';
import type { InvoiceRepository } from '../ports/invoice.repository.js';
import type { FileStorage } from '../ports/file-storage.js';
import type { InvoiceIdGenerator } from '../ports/invoice-id-generator.js';
import type { InvoiceMovementIdGenerator } from '../ports/invoice-movement-id-generator.js';
import type { ProviderRepository } from '../ports/provider.repository.js';
import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { PortError } from '../errors/port.error.js';
import { InvalidProviderStatusError } from '../../domain/errors/invalid-provider-status.error.js';
import { Invoice, InvoiceStatus } from '../../domain/entities/invoice.entity.js';
import { InvoiceMovement } from '../../domain/entities/invoice-movement.entity.js';
import { ProviderStatus } from '../../domain/entities/provider.entity.js';
import type { Provider } from '../../domain/entities/provider.entity.js';
import { InvoiceDate } from '../../domain/value-objects/invoice-date.value-object.js';
import { Money } from '../../domain/value-objects/money.value-object.js';
import { FileRef } from '../../domain/value-objects/file-ref.value-object.js';
import { Cif } from '../../domain/value-objects/cif.value-object.js';
import { InvalidCifError } from '../../domain/errors/invalid-cif.error.js';
import { ProviderNotFoundWithExtractionError } from '../errors/provider-not-found-with-extraction.error.js';
import { ok, fail, type Result } from '../../shared/result.js';

export type UploadInvoiceDocumentRequest = {
    actorUserId: string;
    file: {
        filename: string;
        mimeType: string;
        sizeBytes: number;
        checksum: string;
        content: Buffer;
    };
};

export type UploadInvoiceDocumentResponse = {
    invoiceId: string;
};

export type UploadInvoiceDocumentError =
    | ProviderNotFoundWithExtractionError
    | InvalidProviderStatusError
    | InvalidCifError
    | PortError;

export type UploadInvoiceDocumentDependencies = {
    providerRepository: ProviderRepository;
    invoiceRepository: InvoiceRepository;
    fileStorage: FileStorage;
    extractionAgent: InvoiceExtractionAgent;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
    invoiceIdGenerator: InvoiceIdGenerator;
    invoiceMovementIdGenerator: InvoiceMovementIdGenerator;
};

export class UploadInvoiceDocumentUseCase {
    constructor(private readonly dependencies: UploadInvoiceDocumentDependencies) {}

    async execute(
        request: UploadInvoiceDocumentRequest,
    ): Promise<Result<UploadInvoiceDocumentResponse, UploadInvoiceDocumentError>> {
        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }
        const now = nowResult.value;

        const extractionResult = await this.dependencies.extractionAgent.extract(request.file);
        if (!extractionResult.success) {
            return fail(extractionResult.error);
        }

        const extracted = extractionResult.value;
        const providerResult = await this.resolveProvider(extracted);
        if (!providerResult.success) {
            return fail(providerResult.error);
        }
        const provider = providerResult.value;

        const fileRefResult = await this.storeFile(request.file);
        if (!fileRefResult.success) {
            return fail(fileRefResult.error);
        }
        const fileRef = fileRefResult.value;

        let invoice = this.buildInvoice(provider.id, extracted, fileRef, now, InvoiceStatus.Active);
        if (!invoice.isTotalsConsistent()) {
            invoice = this.buildInvoice(provider.id, extracted, fileRef, now, InvoiceStatus.Inconsistent);
        }

        const createResult = await this.dependencies.invoiceRepository.create(invoice);
        if (!createResult.success) {
            return fail(createResult.error);
        }

        const auditResult = await this.dependencies.auditLogger.log({
            action: 'INVOICE_UPLOADED',
            actorUserId: request.actorUserId,
            targetUserId: invoice.id,
            metadata: {
                providerId: provider.id,
                storageKey: fileRef.storageKey,
            },
            createdAt: now,
        });
        if (!auditResult.success) {
            return fail(auditResult.error);
        }

        return ok({ invoiceId: invoice.id });
    }

    private async resolveProvider(
        extracted: InvoiceExtractionResult,
    ): Promise<Result<Provider, UploadInvoiceDocumentError>> {
        if (!extracted.providerCif) {
            return fail(new ProviderNotFoundWithExtractionError(extracted));
        }

        let normalizedCif: string;
        try {
            normalizedCif = Cif.create(extracted.providerCif).getValue();
        } catch (error) {
            if (error instanceof InvalidCifError) {
                return fail(error);
            }
            throw error;
        }

        const providerResult = await this.dependencies.providerRepository.findByCif(normalizedCif);
        if (!providerResult.success) {
            return fail(providerResult.error);
        }
        const provider = providerResult.value;
        if (!provider) {
            return fail(new ProviderNotFoundWithExtractionError(extracted));
        }
        if (provider.status !== ProviderStatus.Active) {
            return fail(new InvalidProviderStatusError());
        }

        return ok(provider);
    }

    private async storeFile(
        file: UploadInvoiceDocumentRequest['file'],
    ): Promise<Result<FileRef, PortError>> {
        const storeResult = await this.dependencies.fileStorage.store(file);
        if (!storeResult.success) {
            return fail(storeResult.error);
        }
        return ok(FileRef.create(storeResult.value));
    }

    private buildInvoice(
        providerId: string,
        extracted: InvoiceExtractionResult,
        fileRef: FileRef,
        now: Date,
        status: InvoiceStatus,
    ): Invoice {
        const movements = extracted.invoice.movements.map((movement) =>
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

        return Invoice.create({
            id: this.dependencies.invoiceIdGenerator.generate(),
            providerId,
            status,
            ...(extracted.invoice.numeroFactura ? { numeroFactura: extracted.invoice.numeroFactura } : {}),
            ...(extracted.invoice.fechaOperacion ? { fechaOperacion: InvoiceDate.create(extracted.invoice.fechaOperacion) } : {}),
            ...(extracted.invoice.fechaVencimiento
                ? { fechaVencimiento: InvoiceDate.create(extracted.invoice.fechaVencimiento) }
                : {}),
            ...(extracted.invoice.baseImponible === undefined
                ? {}
                : { baseImponible: Money.create(extracted.invoice.baseImponible) }),
            ...(extracted.invoice.iva === undefined ? {} : { iva: Money.create(extracted.invoice.iva) }),
            ...(extracted.invoice.total === undefined ? {} : { total: Money.create(extracted.invoice.total) }),
            fileRef,
            movements,
            createdAt: now,
            updatedAt: now,
        });
    }
}
