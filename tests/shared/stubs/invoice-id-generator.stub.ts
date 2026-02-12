import type { InvoiceIdGenerator } from '../../../src/application/ports/invoice-id-generator.js';

export class InvoiceIdGeneratorStub implements InvoiceIdGenerator {
    constructor(private readonly id: string) {}

    generate(): string {
        return this.id;
    }
}
