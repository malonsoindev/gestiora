export class InvalidInvoiceDateError extends Error {
    constructor(message: string = 'Invalid invoice date') {
        super(message);
        this.name = 'InvalidInvoiceDateError';
    }
}
