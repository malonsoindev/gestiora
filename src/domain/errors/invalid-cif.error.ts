import { DomainError } from '@domain/errors/domain.error.js';

export class InvalidCifError extends DomainError {
    constructor(message: string = 'Invalid CIF') {
        super(message, 'InvalidCifError');
    }
}
