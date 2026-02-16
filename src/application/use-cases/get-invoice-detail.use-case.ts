import type { InvoiceRepository } from '@application/ports/invoice.repository.js';
import type { PortError } from '@application/errors/port.error.js';
import type { GetInvoiceDetailRequest } from '@application/dto/get-invoice-detail.request.js';
import type { GetInvoiceDetailResponse } from '@application/dto/get-invoice-detail.response.js';
import { mapMovementsToDto } from '@application/shared/movement-mappers.js';
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

        return ok({
            invoiceId: invoice.id,
            providerId: invoice.providerId,
            status: invoice.status,
            ...(invoice.fileRef === undefined
                ? {}
                : {
                      fileRef: {
                          storageKey: invoice.fileRef.storageKey,
                          filename: invoice.fileRef.filename,
                          mimeType: invoice.fileRef.mimeType,
                          sizeBytes: invoice.fileRef.sizeBytes,
                          checksum: invoice.fileRef.checksum,
                      },
                  }),
            ...(invoice.numeroFactura === undefined ? {} : { numeroFactura: invoice.numeroFactura }),
            ...(invoice.fechaOperacion === undefined ? {} : { fechaOperacion: invoice.fechaOperacion }),
            ...(invoice.fechaVencimiento === undefined ? {} : { fechaVencimiento: invoice.fechaVencimiento }),
            ...(invoice.baseImponible === undefined ? {} : { baseImponible: invoice.baseImponible }),
            ...(invoice.iva === undefined ? {} : { iva: invoice.iva }),
            ...(invoice.total === undefined ? {} : { total: invoice.total }),
            headerSource: invoice.headerSource,
            headerStatus: invoice.headerStatus,
            createdAt: invoice.createdAt.toISOString(),
            updatedAt: invoice.updatedAt.toISOString(),
            ...(invoice.deletedAt === undefined ? {} : { deletedAt: invoice.deletedAt.toISOString() }),
            movements: mapMovementsToDto(invoice.movements),
        });
    }
}
