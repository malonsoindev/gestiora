import { DomainError } from '@domain/errors/domain.error.js';

export class InvalidEmailError extends DomainError {
    constructor(message: string = 'Invalid email') {
        super(message, 'InvalidEmailError');
    }
}
