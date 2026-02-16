import { DomainError } from '@domain/errors/domain.error.js';

export class InvalidInvoiceDateError extends DomainError {
    constructor(message: string = 'Invalid invoice date') {
        super(message, 'InvalidInvoiceDateError');
    }
}
