import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '@application/ports/id-generator.js';

export class TimestampUserIdGenerator implements IdGenerator {
    generate(): string {
        return `user-${Date.now()}-${randomUUID()}`;
    }
}
