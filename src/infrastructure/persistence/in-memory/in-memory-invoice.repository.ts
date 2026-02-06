import { ok, type Result } from '../../../shared/result.js';
import { PortError } from '../../../application/errors/port.error.js';
import type { InvoiceRepository, InvoiceListFilters, InvoiceListResult } from '../../../application/ports/invoice.repository.js';
import type { Invoice } from '../../../domain/entities/invoice.entity.js';

export class InMemoryInvoiceRepository implements InvoiceRepository {
    private readonly invoicesById = new Map<string, Invoice>();

    constructor(initialInvoices: Invoice[] = []) {
        initialInvoices.forEach((invoice) => this.add(invoice));
    }

    add(invoice: Invoice): void {
        this.invoicesById.set(invoice.id, invoice);
    }

    async create(invoice: Invoice): Promise<Result<void, PortError>> {
        this.add(invoice);
        return ok(undefined);
    }

    async findById(invoiceId: string): Promise<Result<Invoice | null, PortError>> {
        return ok(this.invoicesById.get(invoiceId) ?? null);
    }

    async update(invoice: Invoice): Promise<Result<void, PortError>> {
        this.invoicesById.set(invoice.id, invoice);
        return ok(undefined);
    }

    async list(filters: InvoiceListFilters): Promise<Result<InvoiceListResult, PortError>> {
        const items = Array.from(this.invoicesById.values()).filter((invoice) => {
            if (filters.status !== undefined) {
                if (invoice.status !== filters.status) {
                    return false;
                }
            } else if (invoice.status === 'DELETED') {
                return false;
            }
            if (filters.providerId !== undefined) {
                if (invoice.providerId !== filters.providerId) {
                    return false;
                }
            }
            return true;
        });
        const total = items.length;
        const start = (filters.page - 1) * filters.pageSize;
        const paged = items.slice(start, start + filters.pageSize);
        return ok({ items: paged, total });
    }

    async getDetail(invoiceId: string): Promise<Result<Invoice | null, PortError>> {
        return ok(this.invoicesById.get(invoiceId) ?? null);
    }
}
