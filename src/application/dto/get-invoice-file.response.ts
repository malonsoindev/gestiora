export type GetInvoiceFileResponse = {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    content: Buffer;
};
