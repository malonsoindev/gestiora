import type { InvoiceRepository } from '../ports/invoice.repository.js';
import type { ProviderRepository } from '../ports/provider.repository.js';
import type { PortError } from '../errors/port.error.js';
import type {
    IndexInvoicesForRagRequest,
    IndexInvoicesForRagResponse,
    IndexInvoicesForRagError,
} from '../use-cases/index-invoices-for-rag.use-case.js';
import { InvoiceNotFoundError } from '../../domain/errors/invoice-not-found.error.js';
import { ok, fail, type Result } from '../../shared/result.js';

export type RagReindexInvoiceDependencies = {
    invoiceRepository: InvoiceRepository;
    providerRepository: ProviderRepository;
    indexInvoicesForRagUseCase: {
        execute(request: IndexInvoicesForRagRequest): Promise<Result<IndexInvoicesForRagResponse, IndexInvoicesForRagError>>;
    };
};

export type RagReindexInvoiceError = InvoiceNotFoundError | PortError;

export type RagReindexInvoiceHandler = {
    reindex(invoiceId: string): Promise<Result<void, RagReindexInvoiceError>>;
};

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

        return ok(undefined);
    }
}
