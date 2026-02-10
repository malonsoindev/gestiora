export type GetInvoiceDetailResponse = {
    invoiceId: string;
    providerId: string;
    status: 'DRAFT' | 'ACTIVE' | 'INCONSISTENT' | 'DELETED';
    fileRef?: {
        storageKey: string;
        filename: string;
        mimeType: string;
        sizeBytes: number;
        checksum: string;
    };
    numeroFactura?: string;
    fechaOperacion?: string;
    fechaVencimiento?: string;
    baseImponible?: number;
    iva?: number;
    total?: number;
    headerSource: 'MANUAL' | 'AI';
    headerStatus: 'PROPOSED' | 'CONFIRMED';
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    movements: Array<{
        id: string;
        concepto: string;
        cantidad: number;
        precio: number;
        baseImponible?: number;
        iva?: number;
        total: number;
        source: 'MANUAL' | 'AI';
        status: 'PROPOSED' | 'CONFIRMED' | 'REJECTED';
    }>;
};
