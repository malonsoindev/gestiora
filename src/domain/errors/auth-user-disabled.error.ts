import { DomainError } from '@domain/errors/domain.error.js';

export class AuthUserDisabledError extends DomainError {
    constructor(message: string = 'User is disabled') {
        super(message, 'AuthUserDisabledError');
    }
}
