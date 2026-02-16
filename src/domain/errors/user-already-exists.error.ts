import { DomainError } from '@domain/errors/domain.error.js';

export class UserAlreadyExistsError extends DomainError {
    constructor(message: string = 'User already exists') {
        super(message, 'UserAlreadyExistsError');
    }
}
