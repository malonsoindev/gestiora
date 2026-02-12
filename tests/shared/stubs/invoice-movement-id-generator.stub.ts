import type { InvoiceMovementIdGenerator } from '@application/ports/invoice-movement-id-generator.js';

export class InvoiceMovementIdGeneratorStub implements InvoiceMovementIdGenerator {
    private readonly ids: string[];

    constructor(ids: string[]) {
        this.ids = [...ids];
    }

    generate(): string {
        const id = this.ids.shift();
        return id ?? 'movement-fallback';
    }
}
