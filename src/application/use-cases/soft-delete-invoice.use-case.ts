import type { InvoiceRepository } from '../ports/invoice.repository.js';
import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { PortError } from '../errors/port.error.js';
import type { SoftDeleteInvoiceRequest } from '../dto/soft-delete-invoice.request.js';
import { InvoiceNotFoundError } from '../../domain/errors/invoice-not-found.error.js';
import { ok, fail, type Result } from '../../shared/result.js';

export class SoftDeleteInvoiceUseCase {
    constructor(
        private readonly dependencies: {
            invoiceRepository: InvoiceRepository;
            auditLogger: AuditLogger;
            dateProvider: DateProvider;
        },
    ) {}

    async execute(
        request: SoftDeleteInvoiceRequest,
    ): Promise<Result<void, InvoiceNotFoundError | PortError>> {
        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }
        const now = nowResult.value;

        const invoiceResult = await this.dependencies.invoiceRepository.findById(request.invoiceId);
        if (!invoiceResult.success) {
            return fail(invoiceResult.error);
        }
        const invoice = invoiceResult.value;
        if (!invoice) {
            return fail(new InvoiceNotFoundError());
        }

        const deleted = invoice.markDeleted(now);
        const updateResult = await this.dependencies.invoiceRepository.update(deleted);
        if (!updateResult.success) {
            return fail(updateResult.error);
        }

        const auditResult = await this.dependencies.auditLogger.log({
            action: 'INVOICE_DELETED',
            actorUserId: request.actorUserId,
            targetUserId: deleted.id,
            metadata: {
                invoiceId: deleted.id,
            },
            createdAt: now,
        });
        if (!auditResult.success) {
            return fail(auditResult.error);
        }

        return ok(undefined);
    }
}
