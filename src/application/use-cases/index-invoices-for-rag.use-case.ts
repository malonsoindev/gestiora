import { ok, fail, type Result } from '../../shared/result.js';
import type { PortError } from '../errors/port.error.js';
import type { RagDocument, RagIndexer } from '../ports/rag-indexer.js';
import type { IndexInvoicesForRagRequest } from '../dto/index-invoices-for-rag.request.js';
import type { IndexInvoicesForRagResponse } from '../dto/index-invoices-for-rag.response.js';
import type { Invoice } from '../../domain/entities/invoice.entity.js';
import type { Provider } from '../../domain/entities/provider.entity.js';

export type IndexInvoicesForRagDependencies = {
    ragIndexer: RagIndexer;
    movementsChunkSize: number;
};

export type IndexInvoicesForRagError = PortError;

type InvoiceJson = {
    id: string;
    providerId: string;
    status: string;
    headerSource: string;
    headerStatus: string;
    numeroFactura?: string;
    fechaOperacion?: string;
    fechaVencimiento?: string;
    baseImponible?: number;
    iva?: number;
    total?: number;
    fileRef?: {
        storageKey: string;
        filename: string;
        mimeType: string;
        sizeBytes: number;
        checksum: string;
    };
    movements: Array<{
        id: string;
        concepto: string;
        cantidad: number;
        precio: number;
        baseImponible?: number;
        iva?: number;
        total: number;
        source: string;
        status: string;
    }>;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
};

type ProviderJson = {
    id: string;
    razonSocial: string;
    cif?: string;
    direccion?: string;
    poblacion?: string;
    provincia?: string;
    pais?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
};

type InvoiceWithProviderJson = {
    invoice: InvoiceJson;
    provider: ProviderJson | null;
};

export class IndexInvoicesForRagUseCase {
    constructor(private readonly dependencies: IndexInvoicesForRagDependencies) {}

    async execute(
        request: IndexInvoicesForRagRequest,
    ): Promise<Result<IndexInvoicesForRagResponse, IndexInvoicesForRagError>> {
        const documents = this.buildDocuments(request.rows, this.dependencies.movementsChunkSize);
        const indexResult = await this.dependencies.ragIndexer.index(documents);
        if (!indexResult.success) {
            return fail(indexResult.error);
        }
        return ok({ documentsIndexed: documents.length });
    }

    /**
     * Divide una factura en un chunk base sin movimientos y varios chunks de movimientos
     * para limitar el contexto y mejorar el retrieval.
     * @param row Factura y proveedor asociados.
     * @param movementsChunkSize Cantidad maxima de movimientos por chunk.
     * @returns Documentos listos para indexar.
     */
    private buildInvoiceChunks(row: { invoice: Invoice; provider: Provider | null }, movementsChunkSize: number): RagDocument[] {
        const invoiceJson = this.toInvoiceJson(row.invoice);
        const providerJson = row.provider ? this.toProviderJson(row.provider) : null;
        const baseMetadata = {
            invoiceId: invoiceJson.id,
            providerId: invoiceJson.providerId,
            status: invoiceJson.status,
            numeroFactura: invoiceJson.numeroFactura ?? '',
            fechaOperacion: invoiceJson.fechaOperacion ?? '',
        };

        const baseChunk: RagDocument = {
            text: JSON.stringify({
                invoice: { ...invoiceJson, movements: [] },
                provider: providerJson,
            }),
            metadata: {
                ...baseMetadata,
                chunkType: 'base',
            },
        };

        if (invoiceJson.movements.length === 0) {
            return [baseChunk];
        }

        const movementChunks: RagDocument[] = [];
        for (let i = 0; i < invoiceJson.movements.length; i += movementsChunkSize) {
            const chunkMovements = invoiceJson.movements.slice(i, i + movementsChunkSize);
            movementChunks.push({
                text: JSON.stringify({
                    invoice: {
                        ...invoiceJson,
                        movements: chunkMovements,
                    },
                    provider: providerJson,
                }),
                metadata: {
                    ...baseMetadata,
                    chunkType: 'movements',
                    chunkIndex: String(Math.floor(i / movementsChunkSize)),
                },
            });
        }

        return [baseChunk, ...movementChunks];
    }

    private buildDocuments(rows: Array<{ invoice: Invoice; provider: Provider | null }>, movementsChunkSize: number): RagDocument[] {
        return rows.flatMap((row) => this.buildInvoiceChunks(row, movementsChunkSize));
    }

    private toInvoiceJson(invoice: Invoice): InvoiceJson {
        const numeroFactura = invoice.numeroFactura;
        const fechaOperacion = invoice.fechaOperacion;
        const fechaVencimiento = invoice.fechaVencimiento;
        const baseImponible = invoice.baseImponible;
        const iva = invoice.iva;
        const total = invoice.total;
        const fileRef = invoice.fileRef;
        const deletedAt = invoice.deletedAt;
        return {
            id: invoice.id,
            providerId: invoice.providerId,
            status: invoice.status,
            headerSource: invoice.headerSource,
            headerStatus: invoice.headerStatus,
            ...(numeroFactura === undefined ? {} : { numeroFactura }),
            ...(fechaOperacion === undefined ? {} : { fechaOperacion }),
            ...(fechaVencimiento === undefined ? {} : { fechaVencimiento }),
            ...(baseImponible === undefined ? {} : { baseImponible }),
            ...(iva === undefined ? {} : { iva }),
            ...(total === undefined ? {} : { total }),
            ...(fileRef
                ? {
                      fileRef: {
                          storageKey: fileRef.storageKey,
                          filename: fileRef.filename,
                          mimeType: fileRef.mimeType,
                          sizeBytes: fileRef.sizeBytes,
                          checksum: fileRef.checksum,
                      },
                  }
                : {}),
            movements: invoice.movements.map((movement) => ({
                id: movement.id,
                concepto: movement.concepto,
                cantidad: movement.cantidad,
                precio: movement.precio,
                total: movement.total,
                source: movement.source,
                status: movement.status,
                ...(movement.baseImponible === undefined ? {} : { baseImponible: movement.baseImponible }),
                ...(movement.iva === undefined ? {} : { iva: movement.iva }),
            })),
            createdAt: invoice.createdAt.toISOString(),
            updatedAt: invoice.updatedAt.toISOString(),
            ...(deletedAt ? { deletedAt: deletedAt.toISOString() } : {}),
        };
    }

    private toProviderJson(provider: Provider): ProviderJson {
        const cif = provider.cif;
        const direccion = provider.direccion;
        const poblacion = provider.poblacion;
        const provincia = provider.provincia;
        const pais = provider.pais;
        const deletedAt = provider.deletedAt;
        return {
            id: provider.id,
            razonSocial: provider.razonSocial,
            ...(cif === undefined ? {} : { cif }),
            ...(direccion === undefined ? {} : { direccion }),
            ...(poblacion === undefined ? {} : { poblacion }),
            ...(provincia === undefined ? {} : { provincia }),
            ...(pais === undefined ? {} : { pais }),
            status: provider.status,
            createdAt: provider.createdAt.toISOString(),
            updatedAt: provider.updatedAt.toISOString(),
            ...(deletedAt ? { deletedAt: deletedAt.toISOString() } : {}),
        };
    }
}
