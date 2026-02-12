import { describe, expect, it } from 'vitest';
import { GenkitInvoiceExtractionAgent } from '@infrastructure/adapters/invoice-extraction/genkit-invoice-extraction-agent.js';
import { PortError } from '@application/errors/port.error.js';

type PromptRunner = (context: string) => Promise<{
    providerCif?: string;
    invoice: {
        numeroFactura?: string;
        fechaOperacion?: string;
        fechaVencimiento?: string;
        baseImponible?: number;
        iva?: number;
        total?: number;
        movements?: Array<{
            concepto: string;
            cantidad: number;
            precio: number;
            baseImponible?: number;
            iva?: number;
            total: number;
        }>;
    };
    missingFields?: string[];
}>;

type TextExtractor = (content: Buffer) => Promise<string>;

describe('GenkitInvoiceExtractionAgent', () => {
    it('returns extracted invoice data when prompt succeeds', async () => {
        const file = {
            filename: 'invoice.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 123,
            checksum: 'checksum-1',
            content: Buffer.from('pdf-data'),
        };

        let receivedContent: Buffer | null = null;
        let receivedContext: string | null = null;

        const textExtractor: TextExtractor = async (content) => {
            receivedContent = content;
            return 'extracted text';
        };

        const promptRunner: PromptRunner = async (context) => {
            receivedContext = context;
            return {
                providerCif: 'B12345678',
                invoice: {
                    numeroFactura: 'FAC-2026-0001',
                    fechaOperacion: '2026-02-10',
                    fechaVencimiento: '2026-03-10',
                    baseImponible: 300,
                    iva: 63,
                    total: 363,
                    movements: [
                        {
                            concepto: 'Servicio',
                            cantidad: 1,
                            precio: 300,
                            baseImponible: 300,
                            iva: 63,
                            total: 363,
                        },
                    ],
                },
                missingFields: [],
            };
        };

        const agent = new GenkitInvoiceExtractionAgent({ promptRunner, textExtractor });
        const result = await agent.extract(file);

        expect(receivedContent).toBe(file.content);
        expect(receivedContext).toBe('extracted text');
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.providerCif).toBe('B12345678');
            expect(result.value.invoice.movements).toHaveLength(1);
            expect(result.value.missingFields).toEqual([]);
        }
    });

    it('returns a port error when prompt runner throws', async () => {
        const file = {
            filename: 'invoice.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 123,
            checksum: 'checksum-1',
            content: Buffer.from('pdf-data'),
        };

        const textExtractor: TextExtractor = async () => 'extracted text';
        const promptRunner: PromptRunner = async () => {
            throw new Error('boom');
        };

        const agent = new GenkitInvoiceExtractionAgent({ promptRunner, textExtractor });
        const result = await agent.extract(file);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(PortError);
            expect(result.error.port).toBe('InvoiceExtractionAgent');
        }
    });
});
