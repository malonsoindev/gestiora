import { DomainError } from '@domain/errors/domain.error.js';

export class SearchQueryNotFoundError extends DomainError {
    constructor() {
        super('Search query not found', 'SearchQueryNotFoundError');
    }
}
