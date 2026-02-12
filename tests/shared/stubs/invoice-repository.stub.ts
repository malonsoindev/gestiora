import type { InvoiceRepository, InvoiceListFilters, InvoiceListResult } from '@application/ports/invoice.repository.js';
import type { PortError } from '@application/errors/port.error.js';
import type { Invoice } from '@domain/entities/invoice.entity.js';
import { ok } from '@shared/result.js';

export class InvoiceRepositoryStub implements InvoiceRepository {
    updatedInvoice: Invoice | null = null;
    private readonly invoice: Invoice | null;

    constructor(invoice: Invoice | null) {
        this.invoice = invoice;
    }

    async create(_invoice: Invoice) {
        return ok(undefined);
    }

    async findById(_invoiceId: string) {
        return ok(this.invoice);
    }

    async update(invoice: Invoice) {
        this.updatedInvoice = invoice;
        return ok(undefined);
    }

    async list(_filters: InvoiceListFilters): Promise<
        { success: true; value: InvoiceListResult } | { success: false; error: PortError }
    > {
        return ok({ items: [], total: 0 });
    }

    async getDetail(_invoiceId: string) {
        return ok(this.invoice);
    }
}
