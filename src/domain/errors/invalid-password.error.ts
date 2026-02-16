import { DomainError } from '@domain/errors/domain.error.js';

export class InvalidPasswordError extends DomainError {
    constructor(message: string = 'Password does not meet security requirements') {
        super(message, 'InvalidPasswordError');
    }
}
