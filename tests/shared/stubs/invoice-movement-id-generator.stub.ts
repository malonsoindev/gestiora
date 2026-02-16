import type { IdGenerator } from '@application/ports/id-generator.js';

export class InvoiceMovementIdGeneratorStub implements IdGenerator {
    private readonly ids: string[];

    constructor(ids: string[]) {
        this.ids = [...ids];
    }

    generate(): string {
        const id = this.ids.shift();
        return id ?? 'movement-fallback';
    }
}
