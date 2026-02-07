import type { InvoiceExtractionResult } from '../ports/invoice-extraction-agent.js';

export class ProviderNotFoundWithExtractionError extends Error {
    constructor(public readonly extracted: InvoiceExtractionResult) {
        super('Provider not found');
        this.name = 'ProviderNotFoundWithExtractionError';
    }
}
