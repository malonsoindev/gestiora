export class InvalidInvoiceStatusError extends Error {
    constructor(message: string = 'Invalid invoice status') {
        super(message);
        this.name = 'InvalidInvoiceStatusError';
    }
}
