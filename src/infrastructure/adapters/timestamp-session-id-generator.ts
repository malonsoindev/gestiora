import { randomUUID } from 'node:crypto';
import type { SessionIdGenerator } from '@application/ports/session-id-generator.js';

export class TimestampSessionIdGenerator implements SessionIdGenerator {
    generate(): string {
        return `session-${Date.now()}-${randomUUID()}`;
    }
}
