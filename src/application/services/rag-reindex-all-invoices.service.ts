import type { InvoiceRepository } from '@application/ports/invoice.repository.js';
import type { ProviderRepository } from '@application/ports/provider.repository.js';
import type { SearchQueryRepository } from '@application/ports/search-query.repository.js';
import type { PortError } from '@application/errors/port.error.js';
import type { IndexInvoicesForRagError } from '@application/use-cases/index-invoices-for-rag.use-case.js';
import type { IndexInvoicesForRagRequest } from '@application/dto/index-invoices-for-rag.request.js';
import type { IndexInvoicesForRagResponse } from '@application/dto/index-invoices-for-rag.response.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import { ok, fail, type Result } from '@shared/result.js';

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

export type RagReindexAllInvoicesHandler = {
    reindexAll(): Promise<Result<void, RagReindexAllInvoicesError>>;
};

export class RagReindexAllInvoicesService implements RagReindexAllInvoicesHandler {
    constructor(private readonly dependencies: RagReindexAllInvoicesDependencies) {}

    /**
     * Reindexa todas las facturas activas en el indice RAG.
     * @returns Resultado de la operacion de reindexado.
     */
    async reindexAll(): Promise<Result<void, RagReindexAllInvoicesError>> {
        let page = 1;
        let processed = 0;
        let total = 0;

        while (true) {
            const listResult = await this.dependencies.invoiceRepository.list({
                page,
                pageSize: this.dependencies.pageSize,
            });
            if (!listResult.success) {
                return fail(listResult.error);
            }

            if (page === 1) {
                total = listResult.value.total;
            }

            if (listResult.value.items.length === 0) {
                break;
            }

            const rowsResult = await this.buildRows(listResult.value.items.map((invoice) => invoice.id));
            if (!rowsResult.success) {
                return fail(rowsResult.error);
            }

            const indexResult = await this.indexRows(rowsResult.value);
            if (!indexResult.success) {
                return fail(indexResult.error);
            }

            processed += listResult.value.items.length;
            if (processed >= total) {
                break;
            }
            page += 1;
        }

        const clearResult = await this.dependencies.searchQueryRepository.clearAll();
        if (!clearResult.success) {
            return fail(clearResult.error);
        }

        return ok(undefined);
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

    private async indexRows(rows: IndexInvoicesForRagRequest['rows']): Promise<Result<void, RagReindexAllInvoicesError>> {
        if (rows.length === 0) {
            return ok(undefined);
        }

        const indexResult = await this.dependencies.indexInvoicesForRagUseCase.execute({ rows });
        if (!indexResult.success) {
            return fail(indexResult.error);
        }

        return ok(undefined);
    }
}
