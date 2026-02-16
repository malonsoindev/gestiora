import { DomainError } from '@domain/errors/domain.error.js';

export class SelfDeletionNotAllowedError extends DomainError {
    constructor(message: string = 'Self deletion is not allowed') {
        super(message, 'SelfDeletionNotAllowedError');
    }
}
