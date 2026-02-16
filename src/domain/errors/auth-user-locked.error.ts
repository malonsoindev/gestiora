import { DomainError } from '@domain/errors/domain.error.js';

export class AuthUserLockedError extends DomainError {
    constructor(message: string = 'User is locked') {
        super(message, 'AuthUserLockedError');
    }
}
