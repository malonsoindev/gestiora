export type UpdateManualInvoiceResponse = {
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
    }>;
};
