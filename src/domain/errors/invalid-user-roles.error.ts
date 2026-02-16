import { DomainError } from '@domain/errors/domain.error.js';

export class InvalidUserRolesError extends DomainError {
    constructor(message: string = 'User roles are invalid') {
        super(message, 'InvalidUserRolesError');
    }
}
