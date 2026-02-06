export class InvalidInvoiceTotalsError extends Error {
    constructor(message: string = 'Invalid invoice totals') {
        super(message);
        this.name = 'InvalidInvoiceTotalsError';
    }
}
