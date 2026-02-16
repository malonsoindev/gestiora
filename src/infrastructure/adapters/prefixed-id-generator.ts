import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '@application/ports/id-generator.js';

/**
 * Generates unique IDs with a configurable prefix.
 * Format: `{prefix}-{timestamp}-{uuid}`
 *
 * @example
 * const userIdGenerator = new PrefixedIdGenerator('user');
 * userIdGenerator.generate(); // "user-1707123456789-550e8400-e29b-41d4-a716-446655440000"
 */
export class PrefixedIdGenerator implements IdGenerator {
    constructor(private readonly prefix: string) {}

    generate(): string {
        return `${this.prefix}-${Date.now()}-${randomUUID()}`;
    }
}
