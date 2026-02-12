import { randomUUID } from 'node:crypto';
import type { SearchQueryIdGenerator } from '@application/ports/search-query-id-generator.js';

export class SearchQueryIdGeneratorCrypto implements SearchQueryIdGenerator {
    generate(): string {
        return randomUUID();
    }
}
