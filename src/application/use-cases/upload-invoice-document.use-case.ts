import type { InvoiceExtractionAgent, InvoiceExtractionResult } from '@application/ports/invoice-extraction-agent.js';
import type { InvoiceRepository } from '@application/ports/invoice.repository.js';
import type { FileStorage } from '@application/ports/file-storage.js';
import type { InvoiceIdGenerator } from '@application/ports/invoice-id-generator.js';
import type { InvoiceMovementIdGenerator } from '@application/ports/invoice-movement-id-generator.js';
import type { ProviderRepository } from '@application/ports/provider.repository.js';
import type { ProviderIdGenerator } from '@application/ports/provider-id-generator.js';
import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { PortError } from '@application/errors/port.error.js';
import type { RagReindexInvoiceHandler } from '@application/services/rag-reindex-invoice.service.js';
import type { UploadInvoiceDocumentRequest } from '@application/dto/upload-invoice-document.request.js';
import type { UploadInvoiceDocumentResponse } from '@application/dto/upload-invoice-document.response.js';
import { InvalidProviderStatusError } from '@domain/errors/invalid-provider-status.error.js';
import { Invoice, InvoiceHeaderSource, InvoiceHeaderStatus, InvoiceStatus } from '@domain/entities/invoice.entity.js';
import { InvoiceMovement, InvoiceMovementSource, InvoiceMovementStatus } from '@domain/entities/invoice-movement.entity.js';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import { InvoiceDate } from '@domain/value-objects/invoice-date.value-object.js';
import { Money } from '@domain/value-objects/money.value-object.js';
import { FileRef } from '@domain/value-objects/file-ref.value-object.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';
import { InvalidCifError } from '@domain/errors/invalid-cif.error.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import { ok, fail, type Result } from '@shared/result.js';


export type UploadInvoiceDocumentError =
    | InvalidProviderStatusError
    | InvalidCifError
    | InvoiceNotFoundError
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
    providerIdGenerator: ProviderIdGenerator;
    ragReindexInvoiceService: RagReindexInvoiceHandler;
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
        const providerResult = await this.resolveProvider(extracted, now);
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

        const reindexResult = await this.dependencies.ragReindexInvoiceService.reindex(invoice.id);
        if (!reindexResult.success) {
            return fail(reindexResult.error);
        }

        return ok({ invoiceId: invoice.id });
    }

    private async resolveProvider(
        extracted: InvoiceExtractionResult,
        now: Date,
    ): Promise<Result<Provider, UploadInvoiceDocumentError>> {
        const cifResult = this.normalizeCif(extracted.providerCif);
        if (!cifResult.success) {
            return fail(cifResult.error);
        }
        const normalizedCif = cifResult.value;

        const providerResult = await this.dependencies.providerRepository.findByCif(normalizedCif);
        if (!providerResult.success) {
            return fail(providerResult.error);
        }

        const provider = providerResult.value;
        if (!provider) {
            return this.createDraftProvider(extracted, normalizedCif, now);
        }

        if (provider.status !== ProviderStatus.Active) {
            return fail(new InvalidProviderStatusError());
        }

        return ok(provider);
    }

    private normalizeCif(providerCif: string | undefined): Result<string, InvalidCifError> {
        if (!providerCif) {
            return fail(new InvalidCifError());
        }
        try {
            return ok(Cif.create(providerCif).getValue());
        } catch (error) {
            if (error instanceof InvalidCifError) {
                return fail(error);
            }
            throw error;
        }
    }

    private async createDraftProvider(
        extracted: InvoiceExtractionResult,
        normalizedCif: string,
        now: Date,
    ): Promise<Result<Provider, PortError>> {
        const extractedProvider = extracted.provider;
        const draftProvider = Provider.create({
            id: this.dependencies.providerIdGenerator.generate(),
            razonSocial: extractedProvider?.razonSocial ?? normalizedCif,
            ...(extractedProvider?.direccion && { direccion: extractedProvider.direccion }),
            ...(extractedProvider?.poblacion && { poblacion: extractedProvider.poblacion }),
            ...(extractedProvider?.provincia && { provincia: extractedProvider.provincia }),
            ...(extractedProvider?.pais && { pais: extractedProvider.pais }),
            cif: Cif.create(extractedProvider?.cif ?? normalizedCif),
            status: ProviderStatus.Draft,
            createdAt: now,
            updatedAt: now,
        });

        const createResult = await this.dependencies.providerRepository.create(draftProvider);
        if (!createResult.success) {
            return fail(createResult.error);
        }

        return ok(draftProvider);
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
                source: InvoiceMovementSource.Ai,
                status: InvoiceMovementStatus.Proposed,
            }),
        );

        return Invoice.create({
            id: this.dependencies.invoiceIdGenerator.generate(),
            providerId,
            status,
            headerSource: InvoiceHeaderSource.Ai,
            headerStatus: InvoiceHeaderStatus.Proposed,
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
