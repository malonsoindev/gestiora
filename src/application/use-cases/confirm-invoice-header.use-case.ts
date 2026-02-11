import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { InvoiceRepository } from '../ports/invoice.repository.js';
import type { PortError } from '../errors/port.error.js';
import type { RagReindexInvoiceHandler } from '../services/rag-reindex-invoice.service.js';
import type { ConfirmInvoiceHeaderRequest } from '../dto/confirm-invoice-header.request.js';
import type { ConfirmInvoiceHeaderResponse } from '../dto/confirm-invoice-header.response.js';
import { InvoiceHeaderSource, InvoiceHeaderStatus } from '../../domain/entities/invoice.entity.js';
import { InvoiceNotFoundError } from '../../domain/errors/invoice-not-found.error.js';
import { InvalidInvoiceStatusError } from '../../domain/errors/invalid-invoice-status.error.js';
import { InvoiceDate } from '../../domain/value-objects/invoice-date.value-object.js';
import { Money } from '../../domain/value-objects/money.value-object.js';
import { ok, fail, type Result } from '../../shared/result.js';


export type ConfirmInvoiceHeaderDependencies = {
    invoiceRepository: InvoiceRepository;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
    ragReindexInvoiceService: RagReindexInvoiceHandler;
};

export type ConfirmInvoiceHeaderError =
    | InvoiceNotFoundError
    | InvalidInvoiceStatusError
    | PortError;

export class ConfirmInvoiceHeaderUseCase {
    constructor(private readonly dependencies: ConfirmInvoiceHeaderDependencies) {}

    async execute(
        request: ConfirmInvoiceHeaderRequest,
    ): Promise<Result<ConfirmInvoiceHeaderResponse, ConfirmInvoiceHeaderError>> {
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
        if (invoice.status === 'DELETED') {
            return fail(new InvalidInvoiceStatusError());
        }

        const updates: {
            numeroFactura?: string;
            fechaOperacion?: InvoiceDate;
            fechaVencimiento?: InvoiceDate;
            baseImponible?: Money;
            iva?: Money;
            total?: Money;
            headerSource?: InvoiceHeaderSource;
            headerStatus?: InvoiceHeaderStatus;
        } = {};

        const { fieldUpdates, hasCorrections } = this.processFieldCorrections(request.fields);
        Object.assign(updates, fieldUpdates);

        updates.headerSource = hasCorrections ? InvoiceHeaderSource.Manual : invoice.headerSource;
        updates.headerStatus = InvoiceHeaderStatus.Confirmed;

        const updated = invoice.updateDetails({
            ...updates,
            updatedAt: now,
        });

        const updateResult = await this.dependencies.invoiceRepository.update(updated);
        if (!updateResult.success) {
            return fail(updateResult.error);
        }

        const auditResult = await this.dependencies.auditLogger.log({
            action: 'INVOICE_HEADER_CONFIRMED',
            actorUserId: request.actorUserId,
            targetUserId: updated.id,
            metadata: {
                invoiceId: updated.id,
                fields: JSON.stringify(Object.keys(request.fields)),
            },
            createdAt: now,
        });
        if (!auditResult.success) {
            return fail(auditResult.error);
        }

        const reindexResult = await this.dependencies.ragReindexInvoiceService.reindex(updated.id);
        if (!reindexResult.success) {
            return fail(reindexResult.error);
        }

        return ok({ invoiceId: updated.id });
    }

    private processFieldCorrections(fields: ConfirmInvoiceHeaderRequest['fields']): {
        fieldUpdates: Partial<{
            numeroFactura: string;
            fechaOperacion: InvoiceDate;
            fechaVencimiento: InvoiceDate;
            baseImponible: Money;
            iva: Money;
            total: Money;
        }>;
        hasCorrections: boolean;
    } {
        const fieldUpdates: Record<string, unknown> = {};
        let hasCorrections = false;

        const fieldProcessors = [
            { field: fields.numeroFactura, key: 'numeroFactura', transform: (v: string) => v },
            { field: fields.fechaOperacion, key: 'fechaOperacion', transform: (v: string) => InvoiceDate.create(v) },
            { field: fields.fechaVencimiento, key: 'fechaVencimiento', transform: (v: string) => InvoiceDate.create(v) },
            { field: fields.baseImponible, key: 'baseImponible', transform: (v: number) => Money.create(v) },
            { field: fields.iva, key: 'iva', transform: (v: number) => Money.create(v) },
            { field: fields.total, key: 'total', transform: (v: number) => Money.create(v) },
        ];

        for (const { field, key, transform } of fieldProcessors) {
            if (field?.action === 'CORRECT' && field.value !== undefined) {
                fieldUpdates[key] = transform(field.value as never);
                hasCorrections = true;
            }
        }

        return { fieldUpdates, hasCorrections };
    }
}
