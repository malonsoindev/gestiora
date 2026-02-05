import type { SessionIdGenerator } from '../../application/ports/session-id-generator.js';

export class TimestampSessionIdGenerator implements SessionIdGenerator {
    generate(): string {
        const randomPart = Math.floor(Math.random() * 1_000_000_000).toString(36);
        return `session-${Date.now()}-${randomPart}`;
    }
}
