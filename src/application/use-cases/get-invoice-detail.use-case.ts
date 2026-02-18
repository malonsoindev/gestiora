import type { InvoiceRepository } from '@application/ports/invoice.repository.js';
import type { PortError } from '@application/errors/port.error.js';
import type { GetInvoiceDetailRequest } from '@application/dto/get-invoice-detail.request.js';
import type { GetInvoiceDetailResponse } from '@application/dto/get-invoice-detail.response.js';
import { mapInvoiceToDetailDto } from '@application/shared/movement-mappers.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import { ok, fail, type Result } from '@shared/result.js';

export class GetInvoiceDetailUseCase {
    constructor(private readonly dependencies: { invoiceRepository: InvoiceRepository }) {}

    async execute(
        request: GetInvoiceDetailRequest,
    ): Promise<Result<GetInvoiceDetailResponse, InvoiceNotFoundError | PortError>> {
        const result = await this.dependencies.invoiceRepository.getDetail(request.invoiceId);
        if (!result.success) {
            return fail(result.error);
        }
        const invoice = result.value;
        if (!invoice) {
            return fail(new InvoiceNotFoundError());
        }

        return ok(mapInvoiceToDetailDto(invoice));
    }
}
