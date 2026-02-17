import { DomainError } from '@domain/errors/domain.error.js';

export class InvalidProviderStatusError extends DomainError {
    constructor(message: string = 'Invalid provider status') {
        super(message, 'InvalidProviderStatusError');
    }
}
