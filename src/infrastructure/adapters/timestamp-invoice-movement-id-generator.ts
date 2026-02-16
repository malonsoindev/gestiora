import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '@application/ports/id-generator.js';

export class TimestampInvoiceMovementIdGenerator implements IdGenerator {
    generate(): string {
        return `movement-${Date.now()}-${randomUUID()}`;
    }
}
