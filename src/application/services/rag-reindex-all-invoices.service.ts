import type { InvoiceRepository } from '@application/ports/invoice.repository.js';
import type { ProviderRepository } from '@application/ports/provider.repository.js';
import type { SearchQueryRepository } from '@application/ports/search-query.repository.js';
import type { PortError } from '@application/errors/port.error.js';
import type { IndexInvoicesForRagError } from '@application/use-cases/index-invoices-for-rag.use-case.js';
import type { IndexInvoicesForRagRequest } from '@application/dto/index-invoices-for-rag.request.js';
import type { IndexInvoicesForRagResponse } from '@application/dto/index-invoices-for-rag.response.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import { ok, fail, type Result } from '@shared/result.js';
import { reindexRagPages } from '@application/services/rag-reindex-helpers.js';

export type RagReindexAllInvoicesDependencies = {
    invoiceRepository: InvoiceRepository;
    providerRepository: ProviderRepository;
    searchQueryRepository: SearchQueryRepository;
    indexInvoicesForRagUseCase: {
        execute(request: IndexInvoicesForRagRequest): Promise<Result<IndexInvoicesForRagResponse, IndexInvoicesForRagError>>;
    };
    pageSize: number;
};

export type RagReindexAllInvoicesError = InvoiceNotFoundError | PortError;

export interface RagReindexAllInvoicesHandler {
    reindexAll(): Promise<Result<void, RagReindexAllInvoicesError>>;
}

export class RagReindexAllInvoicesService implements RagReindexAllInvoicesHandler {
    constructor(private readonly dependencies: RagReindexAllInvoicesDependencies) {}

    /**
     * Reindexa todas las facturas activas en el indice RAG.
     * @returns Resultado de la operacion de reindexado.
     */
    async reindexAll(): Promise<Result<void, RagReindexAllInvoicesError>> {
        return reindexRagPages({
            listPage: (page) => this.dependencies.invoiceRepository.list({
                page,
                pageSize: this.dependencies.pageSize,
            }),
            buildRows: (items) => this.buildRows(items.map((invoice) => invoice.id)),
            indexer: this.dependencies.indexInvoicesForRagUseCase,
            searchQueryRepository: this.dependencies.searchQueryRepository,
        });
    }

    private async buildRows(invoiceIds: string[]): Promise<Result<IndexInvoicesForRagRequest['rows'], RagReindexAllInvoicesError>> {
        const rows: IndexInvoicesForRagRequest['rows'] = [];
        for (const invoiceId of invoiceIds) {
            const detailResult = await this.dependencies.invoiceRepository.getDetail(invoiceId);
            if (!detailResult.success) {
                return fail(detailResult.error);
            }
            const detail = detailResult.value;
            if (!detail) {
                return fail(new InvoiceNotFoundError());
            }

            const providerResult = await this.dependencies.providerRepository.findById(detail.providerId);
            if (!providerResult.success) {
                return fail(providerResult.error);
            }

            rows.push({ invoice: detail, provider: providerResult.value });
        }

        return ok(rows);
    }

}
