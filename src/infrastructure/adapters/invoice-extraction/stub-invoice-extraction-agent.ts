import type { InvoiceExtractionAgent, InvoiceExtractionFile } from '@application/ports/invoice-extraction-agent.js';
import { ok } from '@shared/result.js';

export class StubInvoiceExtractionAgent implements InvoiceExtractionAgent {
    async extract(_file: InvoiceExtractionFile) {
        return ok({
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
        });
    }
}
