import type { Invoice } from '../../domain/entities/invoice.entity.js';
import type { PortError } from '../errors/port.error.js';
import type { Result } from '../../shared/result.js';

export interface InvoiceRepository {
    create(invoice: Invoice): Promise<Result<void, PortError>>;
}
