import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { InvoiceRepository } from '../ports/invoice.repository.js';
import type { PortError } from '../errors/port.error.js';
import { InvoiceHeaderSource, InvoiceHeaderStatus } from '../../domain/entities/invoice.entity.js';
import { InvoiceNotFoundError } from '../../domain/errors/invoice-not-found.error.js';
import { InvalidInvoiceStatusError } from '../../domain/errors/invalid-invoice-status.error.js';
import { InvoiceDate } from '../../domain/value-objects/invoice-date.value-object.js';
import { Money } from '../../domain/value-objects/money.value-object.js';
import { ok, fail, type Result } from '../../shared/result.js';

export type ConfirmInvoiceHeaderRequest = {
    actorUserId: string;
    invoiceId: string;
    fields: {
        numeroFactura?: { action: 'CONFIRM' | 'CORRECT'; value?: string };
        fechaOperacion?: { action: 'CONFIRM' | 'CORRECT'; value?: string };
        fechaVencimiento?: { action: 'CONFIRM' | 'CORRECT'; value?: string };
        baseImponible?: { action: 'CONFIRM' | 'CORRECT'; value?: number };
        iva?: { action: 'CONFIRM' | 'CORRECT'; value?: number };
        total?: { action: 'CONFIRM' | 'CORRECT'; value?: number };
    };
};

export type ConfirmInvoiceHeaderResponse = {
    invoiceId: string;
};

export type ConfirmInvoiceHeaderDependencies = {
    invoiceRepository: InvoiceRepository;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
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

        const fields = request.fields;
        let hasCorrections = false;
        if (fields.numeroFactura?.action === 'CORRECT' && fields.numeroFactura.value !== undefined) {
            updates.numeroFactura = fields.numeroFactura.value;
            hasCorrections = true;
        }
        if (fields.fechaOperacion?.action === 'CORRECT' && fields.fechaOperacion.value !== undefined) {
            updates.fechaOperacion = InvoiceDate.create(fields.fechaOperacion.value);
            hasCorrections = true;
        }
        if (fields.fechaVencimiento?.action === 'CORRECT' && fields.fechaVencimiento.value !== undefined) {
            updates.fechaVencimiento = InvoiceDate.create(fields.fechaVencimiento.value);
            hasCorrections = true;
        }
        if (fields.baseImponible?.action === 'CORRECT' && fields.baseImponible.value !== undefined) {
            updates.baseImponible = Money.create(fields.baseImponible.value);
            hasCorrections = true;
        }
        if (fields.iva?.action === 'CORRECT' && fields.iva.value !== undefined) {
            updates.iva = Money.create(fields.iva.value);
            hasCorrections = true;
        }
        if (fields.total?.action === 'CORRECT' && fields.total.value !== undefined) {
            updates.total = Money.create(fields.total.value);
            hasCorrections = true;
        }

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

        return ok({ invoiceId: updated.id });
    }
}
