import { DomainError } from '@domain/errors/domain.error.js';

export class InvalidFileRefError extends DomainError {
    constructor(message: string = 'Invalid file ref') {
        super(message, 'InvalidFileRefError');
    }
}
