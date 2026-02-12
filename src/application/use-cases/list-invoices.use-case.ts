import type { InvoiceRepository } from '@application/ports/invoice.repository.js';
import type { PortError } from '@application/errors/port.error.js';
import type { ListInvoicesRequest } from '@application/dto/list-invoices.request.js';
import type { ListInvoicesResponse } from '@application/dto/list-invoices.response.js';
import { ok, type Result } from '@shared/result.js';

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
