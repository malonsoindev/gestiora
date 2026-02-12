import { PortError } from '@application/errors/port.error.js';
import { fail, ok, type Result } from '@shared/result.js';

type PdfParser = (content: Buffer) => Promise<{ text: string }>;

export class PdfTextExtractor {
    constructor(private readonly parser: PdfParser) {}

    async extract(content: Buffer): Promise<Result<string, PortError>> {
        try {
            const result = await this.parser(content);
            return ok(result.text);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('PdfTextExtractor', 'Failed to extract text from PDF', cause));
        }
    }
}
