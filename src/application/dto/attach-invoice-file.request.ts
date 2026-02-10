export type AttachInvoiceFileRequest = {
    actorUserId: string;
    invoiceId: string;
    file: {
        filename: string;
        mimeType: string;
        sizeBytes: number;
        checksum: string;
        content: Buffer;
    };
};
