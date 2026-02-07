import type { InvoiceRepository } from '../ports/invoice.repository.js';
import type { PortError } from '../errors/port.error.js';
import { ok, type Result } from '../../shared/result.js';

export type ListInvoicesRequest = {
    status?: 'DRAFT' | 'ACTIVE' | 'DELETED';
    providerId?: string;
    page: number;
    pageSize: number;
};

export type ListInvoicesResponse = {
    items: Array<{
        invoiceId: string;
        providerId: string;
        status: 'DRAFT' | 'ACTIVE' | 'DELETED';
        createdAt: Date;
    }>;
    page: number;
    pageSize: number;
    total: number;
};

export class ListInvoicesUseCase {
    constructor(private readonly dependencies: { invoiceRepository: InvoiceRepository }) {}

    async execute(request: ListInvoicesRequest): Promise<Result<ListInvoicesResponse, PortError>> {
        const result = await this.dependencies.invoiceRepository.list({
            page: request.page,
            pageSize: request.pageSize,
            ...(request.status ? { status: request.status } : {}),
            ...(request.providerId ? { providerId: request.providerId } : {}),
        });

        if (!result.success) {
            return result;
        }

        return ok({
            items: result.value.items.map((invoice) => ({
                invoiceId: invoice.id,
                providerId: invoice.providerId,
                status: invoice.status,
                createdAt: invoice.createdAt,
            })),
            page: request.page,
            pageSize: request.pageSize,
            total: result.value.total,
        });
    }
}
