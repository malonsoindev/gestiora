import type { ProviderIdGenerator } from '../../application/ports/provider-id-generator.js';

export class TimestampProviderIdGenerator implements ProviderIdGenerator {
    generate(): string {
        const randomPart = Math.floor(Math.random() * 1_000_000_000).toString(36);
        return `provider-${Date.now()}-${randomPart}`;
    }
}
