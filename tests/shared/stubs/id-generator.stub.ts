import type { IdGenerator } from '@application/ports/id-generator.js';

/**
 * Generic IdGenerator stub for testing.
 * Returns a fixed ID or cycles through a list of IDs.
 *
 * @example Single ID
 * ```typescript
 * const idGen = new IdGeneratorStub('provider-fixed');
 * idGen.generate(); // 'provider-fixed'
 * idGen.generate(); // 'provider-fixed'
 * ```
 *
 * @example Multiple IDs (cycles through list)
 * ```typescript
 * const idGen = new IdGeneratorStub(['id-1', 'id-2']);
 * idGen.generate(); // 'id-1'
 * idGen.generate(); // 'id-2'
 * idGen.generate(); // 'id-fallback' (default fallback)
 * ```
 */
export class IdGeneratorStub implements IdGenerator {
    private readonly ids: string[];
    private index = 0;
    private readonly fallback: string;

    constructor(idOrIds: string | string[], fallback = 'id-fallback') {
        this.ids = Array.isArray(idOrIds) ? [...idOrIds] : [idOrIds];
        this.fallback = fallback;
    }

    generate(): string {
        if (this.ids.length === 1) {
            return this.ids[0] ?? this.fallback;
        }
        const id = this.ids[this.index];
        if (this.index < this.ids.length && id !== undefined) {
            this.index++;
            return id;
        }
        return this.fallback;
    }
}
