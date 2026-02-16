import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '@application/ports/id-generator.js';

export class TimestampSessionIdGenerator implements IdGenerator {
    generate(): string {
        return `session-${Date.now()}-${randomUUID()}`;
    }
}
