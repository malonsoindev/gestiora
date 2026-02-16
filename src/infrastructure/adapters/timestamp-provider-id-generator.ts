import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '@application/ports/id-generator.js';

export class TimestampProviderIdGenerator implements IdGenerator {
    generate(): string {
        return `provider-${Date.now()}-${randomUUID()}`;
    }
}
