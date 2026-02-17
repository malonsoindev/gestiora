import { DomainError } from '@domain/errors/domain.error.js';

export class InvalidUserStatusError extends DomainError {
    constructor(message: string = 'User status is invalid') {
        super(message, 'InvalidUserStatusError');
    }
}
