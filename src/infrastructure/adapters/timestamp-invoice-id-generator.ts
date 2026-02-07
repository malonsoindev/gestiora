import { randomUUID } from 'node:crypto';
import type { InvoiceIdGenerator } from '../../application/ports/invoice-id-generator.js';

export class TimestampInvoiceIdGenerator implements InvoiceIdGenerator {
    generate(): string {
        return `invoice-${Date.now()}-${randomUUID()}`;
    }
}
