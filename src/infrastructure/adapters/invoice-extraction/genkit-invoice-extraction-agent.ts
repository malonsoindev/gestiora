import type {
    InvoiceExtractionAgent,
    InvoiceExtractionFile,
    InvoiceExtractionResult,
} from '@application/ports/invoice-extraction-agent.js';
import { PortError } from '@application/errors/port.error.js';
import { fail, ok, type Result } from '@shared/result.js';
import type { InvoiceExtractionPromptOutput } from '@infrastructure/adapters/invoice-extraction/genkit-invoice-extraction-prompt-runner.js';

type GenkitInvoiceExtractionAgentDependencies = {
    promptRunner: (context: string) => Promise<InvoiceExtractionPromptOutput>;
    textExtractor: (content: Buffer) => Promise<string>;
};

export class GenkitInvoiceExtractionAgent implements InvoiceExtractionAgent {
    constructor(private readonly dependencies: GenkitInvoiceExtractionAgentDependencies) {}

    async extract(file: InvoiceExtractionFile): Promise<Result<InvoiceExtractionResult, PortError>> {
        try {
            const text = await this.dependencies.textExtractor(file.content);
            const output = await this.dependencies.promptRunner(text);

            const value: InvoiceExtractionResult = {
                invoice: {
                    ...output.invoice,
                    movements: output.invoice.movements ?? [],
                },
                missingFields: output.missingFields ?? [],
            };

            if (output.providerCif !== undefined) {
                value.providerCif = output.providerCif;
            }
            if (output.provider !== undefined) {
                value.provider = output.provider;
            }

            return ok(value);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('InvoiceExtractionAgent', 'Failed to extract invoice', cause));
        }
    }
}
