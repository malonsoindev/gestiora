import { describe, expect, it } from 'vitest';
import { PdfTextExtractor } from '../../../../src/infrastructure/adapters/invoice-extraction/pdf-text-extractor.js';
import { PortError } from '../../../../src/application/errors/port.error.js';

type PdfParser = (content: Buffer) => Promise<{ text: string }>;

describe('PdfTextExtractor', () => {
    it('returns extracted text from parser', async () => {
        const parser: PdfParser = async () => ({ text: 'invoice text' });
        const extractor = new PdfTextExtractor(parser);

        const result = await extractor.extract(Buffer.from('pdf-data'));

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value).toBe('invoice text');
        }
    });

    it('returns port error when parser throws', async () => {
        const parser: PdfParser = async () => {
            throw new Error('boom');
        };
        const extractor = new PdfTextExtractor(parser);

        const result = await extractor.extract(Buffer.from('pdf-data'));

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(PortError);
            expect(result.error.port).toBe('PdfTextExtractor');
        }
    });
});
