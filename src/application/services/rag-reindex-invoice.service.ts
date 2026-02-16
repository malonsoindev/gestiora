import type { InvoiceRepository } from '@application/ports/invoice.repository.js';
import type { ProviderRepository } from '@application/ports/provider.repository.js';
import type { SearchQueryRepository } from '@application/ports/search-query.repository.js';
import type { PortError } from '@application/errors/port.error.js';
import type { IndexInvoicesForRagRequest } from '@application/dto/index-invoices-for-rag.request.js';
import type { IndexInvoicesForRagResponse } from '@application/dto/index-invoices-for-rag.response.js';
import type { IndexInvoicesForRagError } from '@application/use-cases/index-invoices-for-rag.use-case.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import { ok, fail, type Result } from '@shared/result.js';

export type RagReindexInvoiceDependencies = {
    invoiceRepository: InvoiceRepository;
    providerRepository: ProviderRepository;
    searchQueryRepository: SearchQueryRepository;
    indexInvoicesForRagUseCase: {
        execute(request: IndexInvoicesForRagRequest): Promise<Result<IndexInvoicesForRagResponse, IndexInvoicesForRagError>>;
    };
};

export type RagReindexInvoiceError = InvoiceNotFoundError | PortError;

export interface RagReindexInvoiceHandler {
    reindex(invoiceId: string): Promise<Result<void, RagReindexInvoiceError>>;
}

export class RagReindexInvoiceService {
    constructor(private readonly dependencies: RagReindexInvoiceDependencies) {}

    /**
     * Reindexa una factura y su proveedor asociado en el indice RAG.
     * Si el proveedor no existe, se indexa la factura con proveedor nulo.
     * @param invoiceId Identificador de la factura.
     * @returns Resultado de la operacion de reindexado.
     */
    async reindex(invoiceId: string): Promise<Result<void, RagReindexInvoiceError>> {
        const invoiceResult = await this.dependencies.invoiceRepository.getDetail(invoiceId);
        if (!invoiceResult.success) {
            return fail(invoiceResult.error);
        }
        const invoice = invoiceResult.value;
        if (!invoice) {
            return fail(new InvoiceNotFoundError());
        }

        const providerResult = await this.dependencies.providerRepository.findById(invoice.providerId);
        if (!providerResult.success) {
            return fail(providerResult.error);
        }

        const indexResult = await this.dependencies.indexInvoicesForRagUseCase.execute({
            rows: [{ invoice, provider: providerResult.value }],
        });
        if (!indexResult.success) {
            return fail(indexResult.error);
        }

        const clearResult = await this.dependencies.searchQueryRepository.clearAll();
        if (!clearResult.success) {
            return fail(clearResult.error);
        }

        return ok(undefined);
    }
}
