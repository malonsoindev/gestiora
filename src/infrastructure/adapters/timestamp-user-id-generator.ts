import type { UserIdGenerator } from '../../application/ports/user-id-generator.js';

export class TimestampUserIdGenerator implements UserIdGenerator {
    generate(): string {
        const randomPart = Math.floor(Math.random() * 1_000_000_000).toString(36);
        return `user-${Date.now()}-${randomPart}`;
    }
}
