import { randomUUID } from 'node:crypto';
import type { InvoiceMovementIdGenerator } from '@application/ports/invoice-movement-id-generator.js';

export class TimestampInvoiceMovementIdGenerator implements InvoiceMovementIdGenerator {
    generate(): string {
        return `movement-${Date.now()}-${randomUUID()}`;
    }
}
