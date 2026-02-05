import { randomUUID } from 'node:crypto';
import type { UserIdGenerator } from '../../application/ports/user-id-generator.js';

export class TimestampUserIdGenerator implements UserIdGenerator {
    generate(): string {
        return `user-${Date.now()}-${randomUUID()}`;
    }
}
