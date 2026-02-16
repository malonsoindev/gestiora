import { DomainError } from '@domain/errors/domain.error.js';

export class AuthRateLimitedError extends DomainError {
    constructor(message: string = 'Too many attempts') {
        super(message, 'AuthRateLimitedError');
    }
}
