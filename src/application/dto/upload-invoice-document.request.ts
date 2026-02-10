export type UploadInvoiceDocumentRequest = {
    actorUserId: string;
    file: {
        filename: string;
        mimeType: string;
        sizeBytes: number;
        checksum: string;
        content: Buffer;
    };
};
