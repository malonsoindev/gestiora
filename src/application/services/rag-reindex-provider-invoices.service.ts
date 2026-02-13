import type { InvoiceRepository } from '@application/ports/invoice.repository.js';
import type { ProviderRepository } from '@application/ports/provider.repository.js';
import type { SearchQueryRepository } from '@application/ports/search-query.repository.js';
import type { PortError } from '@application/errors/port.error.js';
import type { IndexInvoicesForRagError } from '@application/use-cases/index-invoices-for-rag.use-case.js';
import type { IndexInvoicesForRagRequest } from '@application/dto/index-invoices-for-rag.request.js';
import type { IndexInvoicesForRagResponse } from '@application/dto/index-invoices-for-rag.response.js';
import type { Invoice } from '@domain/entities/invoice.entity.js';
import type { Provider } from '@domain/entities/provider.entity.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import { ProviderNotFoundError } from '@domain/errors/provider-not-found.error.js';
import { ok, fail, type Result } from '@shared/result.js';
import { reindexRagPages } from '@application/services/rag-reindex-helpers.js';

export type RagReindexProviderInvoicesDependencies = {
    invoiceRepository: InvoiceRepository;
    providerRepository: ProviderRepository;
    searchQueryRepository: SearchQueryRepository;
    indexInvoicesForRagUseCase: {
        execute(request: IndexInvoicesForRagRequest): Promise<Result<IndexInvoicesForRagResponse, IndexInvoicesForRagError>>;
    };
    pageSize: number;
};

export type RagReindexProviderInvoicesError = ProviderNotFoundError | InvoiceNotFoundError | PortError;

export type RagReindexProviderInvoicesHandler = {
    reindexByProviderId(providerId: string): Promise<Result<void, RagReindexProviderInvoicesError>>;
};

export class RagReindexProviderInvoicesService implements RagReindexProviderInvoicesHandler {
    constructor(private readonly dependencies: RagReindexProviderInvoicesDependencies) {}

    /**
     * Reindexa todas las facturas activas de un proveedor en el indice RAG.
     * @param providerId Identificador del proveedor.
     * @returns Resultado de la operacion de reindexado.
     */
    async reindexByProviderId(providerId: string): Promise<Result<void, RagReindexProviderInvoicesError>> {
        const providerResult = await this.getProvider(providerId);
        if (!providerResult.success) {
            return fail(providerResult.error);
        }
        return reindexRagPages({
            listPage: (page) => this.listProviderInvoices(providerId, page),
            buildRows: (items) => this.buildRows(items, providerResult.value),
            indexer: this.dependencies.indexInvoicesForRagUseCase,
            searchQueryRepository: this.dependencies.searchQueryRepository,
        });
    }

    private async getProvider(providerId: string): Promise<Result<Provider, RagReindexProviderInvoicesError>> {
        const providerResult = await this.dependencies.providerRepository.findById(providerId);
        if (!providerResult.success) {
            return fail(providerResult.error);
        }
        const provider = providerResult.value;
        if (!provider) {
            return fail(new ProviderNotFoundError());
        }
        return ok(provider);
    }

    private async listProviderInvoices(
        providerId: string,
        page: number,
    ): Promise<Result<{ items: Invoice[]; total: number }, RagReindexProviderInvoicesError>> {
        const listResult = await this.dependencies.invoiceRepository.list({
            page,
            pageSize: this.dependencies.pageSize,
            providerId,
        });
        if (!listResult.success) {
            return fail(listResult.error);
        }
        return ok(listResult.value);
    }

    private async buildRows(
        invoices: Invoice[],
        provider: Provider,
    ): Promise<Result<IndexInvoicesForRagRequest['rows'], RagReindexProviderInvoicesError>> {
        const rows: IndexInvoicesForRagRequest['rows'] = [];
        for (const invoice of invoices) {
            const detailResult = await this.dependencies.invoiceRepository.getDetail(invoice.id);
            if (!detailResult.success) {
                return fail(detailResult.error);
            }
            const detail = detailResult.value;
            if (!detail) {
                return fail(new InvoiceNotFoundError());
            }
            rows.push({ invoice: detail, provider });
        }
        return ok(rows);
    }

}
