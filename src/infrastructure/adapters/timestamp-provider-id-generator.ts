import { randomUUID } from 'node:crypto';
import type { ProviderIdGenerator } from '../../application/ports/provider-id-generator.js';

export class TimestampProviderIdGenerator implements ProviderIdGenerator {
    generate(): string {
        return `provider-${Date.now()}-${randomUUID()}`;
    }
}
