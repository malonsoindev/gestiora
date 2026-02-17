import { DomainError } from '@domain/errors/domain.error.js';

export class AuthInvalidCredentialsError extends DomainError {
    constructor(message: string = 'Invalid credentials') {
        super(message, 'AuthInvalidCredentialsError');
    }
}
