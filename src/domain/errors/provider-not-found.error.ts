import { DomainError } from '@domain/errors/domain.error.js';

export class ProviderNotFoundError extends DomainError {
    constructor(message: string = 'Provider not found') {
        super(message, 'ProviderNotFoundError');
    }
}
