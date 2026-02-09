import type { Result } from '../../shared/result.js';
import type { PortError } from '../errors/port.error.js';

export type ExtractedInvoice = {
    numeroFactura?: string;
    fechaOperacion?: string;
    fechaVencimiento?: string;
    baseImponible?: number;
    iva?: number;
    total?: number;
    movements: Array<{
        concepto: string;
        cantidad: number;
        precio: number;
        baseImponible?: number;
        iva?: number;
        total: number;
    }>;
};

export type InvoiceExtractionResult = {
    providerCif?: string;
    provider?: {
        razonSocial?: string;
        cif?: string;
        direccion?: string;
        poblacion?: string;
        provincia?: string;
        pais?: string;
    };
    invoice: ExtractedInvoice;
    missingFields: string[];
};

export type InvoiceExtractionFile = {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    checksum: string;
    content: Buffer;
};

export interface InvoiceExtractionAgent {
    extract(file: InvoiceExtractionFile): Promise<Result<InvoiceExtractionResult, PortError>>;
}
