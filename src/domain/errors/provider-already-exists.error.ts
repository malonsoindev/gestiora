import { DomainError } from '@domain/errors/domain.error.js';

export class ProviderAlreadyExistsError extends DomainError {
    constructor(message: string = 'Provider already exists') {
        super(message, 'ProviderAlreadyExistsError');
    }
}
