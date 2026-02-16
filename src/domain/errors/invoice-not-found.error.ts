import { DomainError } from '@domain/errors/domain.error.js';

export class InvoiceNotFoundError extends DomainError {
    constructor(message: string = 'Invoice not found') {
        super(message, 'InvoiceNotFoundError');
    }
}
