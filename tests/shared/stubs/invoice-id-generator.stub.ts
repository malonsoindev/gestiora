import type { IdGenerator } from '@application/ports/id-generator.js';

export class InvoiceIdGeneratorStub implements IdGenerator {
    constructor(private readonly id: string) {}

    generate(): string {
        return this.id;
    }
}
