import type { InvoiceRepository } from '../../../src/application/ports/invoice.repository.js';
import type { Invoice, InvoiceStatus } from '../../../src/domain/entities/invoice.entity.js';
import { ok } from '../../../src/shared/result.js';

export class InvoiceRepositorySpy implements InvoiceRepository {
    createdInvoice: Invoice | null = null;

    async create(invoice: Invoice) {
        this.createdInvoice = invoice;
        return ok(undefined);
    }

    async findById(_invoiceId: string) {
        return ok(null);
    }

    async update(_invoice: Invoice) {
        return ok(undefined);
    }

    async list(_filters: { status?: InvoiceStatus; providerId?: string; page: number; pageSize: number }) {
        return ok({ items: [], total: 0 });
    }

    async getDetail(_invoiceId: string) {
        return ok(null);
    }
}
