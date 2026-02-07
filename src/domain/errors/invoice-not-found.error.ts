export class InvoiceNotFoundError extends Error {
    constructor(message: string = 'Invoice not found') {
        super(message);
        this.name = 'InvoiceNotFoundError';
    }
}
