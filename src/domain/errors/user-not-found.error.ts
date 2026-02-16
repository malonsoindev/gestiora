import { DomainError } from '@domain/errors/domain.error.js';

export class UserNotFoundError extends DomainError {
    constructor(message: string = 'User not found') {
        super(message, 'UserNotFoundError');
    }
}
