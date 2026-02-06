import type { InvoiceRepository } from '../ports/invoice.repository.js';
import type { FileStorage } from '../ports/file-storage.js';
import type { PortError } from '../errors/port.error.js';
import { InvoiceNotFoundError } from '../../domain/errors/invoice-not-found.error.js';
import { InvalidInvoiceStatusError } from '../../domain/errors/invalid-invoice-status.error.js';
import { InvoiceStatus } from '../../domain/entities/invoice.entity.js';
import { ok, fail, type Result } from '../../shared/result.js';

export type GetInvoiceFileRequest = {
    invoiceId: string;
};

export type GetInvoiceFileResponse = {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    content: Buffer;
};

export class GetInvoiceFileUseCase {
    constructor(
        private readonly dependencies: {
            invoiceRepository: InvoiceRepository;
            fileStorage: FileStorage;
        },
    ) {}

    async execute(
        request: GetInvoiceFileRequest,
    ): Promise<Result<GetInvoiceFileResponse, InvoiceNotFoundError | InvalidInvoiceStatusError | PortError>> {
        const invoiceResult = await this.dependencies.invoiceRepository.findById(request.invoiceId);
        if (!invoiceResult.success) {
            return fail(invoiceResult.error);
        }
        const invoice = invoiceResult.value;
        if (!invoice) {
            return fail(new InvoiceNotFoundError());
        }
        if (invoice.status === InvoiceStatus.Deleted) {
            return fail(new InvalidInvoiceStatusError());
        }
        if (!invoice.fileRef) {
            return fail(new InvoiceNotFoundError());
        }

        const fileResult = await this.dependencies.fileStorage.get(invoice.fileRef.storageKey);
        if (!fileResult.success) {
            return fail(fileResult.error);
        }

        return ok({
            filename: fileResult.value.filename,
            mimeType: fileResult.value.mimeType,
            sizeBytes: fileResult.value.sizeBytes,
            content: fileResult.value.content,
        });
    }
}
