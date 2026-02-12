export class SearchQueryNotFoundError extends Error {
    constructor() {
        super('Search query not found');
        this.name = 'SearchQueryNotFoundError';
    }
}
