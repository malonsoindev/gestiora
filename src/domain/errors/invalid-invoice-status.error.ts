import { DomainError } from '@domain/errors/domain.error.js';

export class InvalidInvoiceStatusError extends DomainError {
    constructor(message: string = 'Invalid invoice status') {
        super(message, 'InvalidInvoiceStatusError');
    }
}
