import type { InvoiceRepository } from '../ports/invoice.repository.js';
import type { ProviderRepository } from '../ports/provider.repository.js';
import type { PortError } from '../errors/port.error.js';
import type {
    IndexInvoicesForRagRequest,
    IndexInvoicesForRagResponse,
    IndexInvoicesForRagError,
} from '../use-cases/index-invoices-for-rag.use-case.js';
import { InvoiceNotFoundError } from '../../domain/errors/invoice-not-found.error.js';
import { ProviderNotFoundError } from '../../domain/errors/provider-not-found.error.js';
import { ok, fail, type Result } from '../../shared/result.js';

export type RagReindexProviderInvoicesDependencies = {
    invoiceRepository: InvoiceRepository;
    providerRepository: ProviderRepository;
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
        const providerResult = await this.dependencies.providerRepository.findById(providerId);
        if (!providerResult.success) {
            return fail(providerResult.error);
        }
        const provider = providerResult.value;
        if (!provider) {
            return fail(new ProviderNotFoundError());
        }

        let page = 1;
        let processed = 0;
        let total = 0;

        while (true) {
            const listResult = await this.dependencies.invoiceRepository.list({
                page,
                pageSize: this.dependencies.pageSize,
                providerId,
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

            const rows = [] as Array<{ invoice: (typeof listResult.value.items)[number]; provider: typeof provider }>;
            for (const invoice of listResult.value.items) {
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

            if (rows.length > 0) {
                const indexResult = await this.dependencies.indexInvoicesForRagUseCase.execute({ rows });
                if (!indexResult.success) {
                    return fail(indexResult.error);
                }
            }

            processed += listResult.value.items.length;
            if (processed >= total) {
                break;
            }
            page += 1;
        }

        return ok(undefined);
    }
}
