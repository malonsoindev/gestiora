import { DomainError } from '@domain/errors/domain.error.js';

export class AuthInvalidRefreshTokenError extends DomainError {
    constructor(message: string = 'Invalid refresh token') {
        super(message, 'AuthInvalidRefreshTokenError');
    }
}
