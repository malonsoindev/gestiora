import { createRequire } from 'node:module';

export type PdfParse = (content: Buffer) => Promise<{ text: string }>;

export const resolvePdfParse = (module: unknown): PdfParse => {
    if (typeof module === 'function') {
        return module as PdfParse;
    }

    if (module && typeof module === 'object') {
        const candidate = module as Record<string, unknown>;
        if (typeof candidate.default === 'function') {
            return candidate.default as PdfParse;
        }

        if (
            candidate.default &&
            typeof candidate.default === 'object' &&
            typeof (candidate.default as Record<string, unknown>).default === 'function'
        ) {
            return (candidate.default as Record<string, unknown>).default as PdfParse;
        }

        if (typeof candidate.PDFParse === 'function') {
            return async (content: Buffer) => {
                const parser = new (candidate.PDFParse as new (options: { data: Buffer }) => {
                    getText: () => Promise<{ text: string }>;
                    destroy: () => Promise<void>;
                })({ data: content });
                const result = await parser.getText();
                await parser.destroy();
                return result;
            };
        }
    }

    throw new Error('Unsupported pdf-parse module format');
};

export const loadPdfParse = (): PdfParse => {
    const require = createRequire(import.meta.url);
    const pdfParseModule = require('pdf-parse');
    return resolvePdfParse(pdfParseModule);
};
