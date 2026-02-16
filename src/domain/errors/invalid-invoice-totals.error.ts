import { DomainError } from '@domain/errors/domain.error.js';

export class InvalidInvoiceTotalsError extends DomainError {
    constructor(message: string = 'Invalid invoice totals') {
        super(message, 'InvalidInvoiceTotalsError');
    }
}
