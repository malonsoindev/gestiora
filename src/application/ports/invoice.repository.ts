import type { Invoice } from '../../domain/entities/invoice.entity.js';
import type { PortError } from '../errors/port.error.js';
import type { Result } from '../../shared/result.js';

export type InvoiceListFilters = {
    status?: 'DRAFT' | 'ACTIVE' | 'DELETED';
    providerId?: string;
    page: number;
    pageSize: number;
};

export type InvoiceListResult = {
    items: Invoice[];
    total: number;
};

export interface InvoiceRepository {
    create(invoice: Invoice): Promise<Result<void, PortError>>;
    findById(invoiceId: string): Promise<Result<Invoice | null, PortError>>;
    update(invoice: Invoice): Promise<Result<void, PortError>>;
    list(filters: InvoiceListFilters): Promise<Result<InvoiceListResult, PortError>>;
    getDetail(invoiceId: string): Promise<Result<Invoice | null, PortError>>;
}
