export class QueryTooAmbiguousError extends Error {
    constructor() {
        super('Query too ambiguous');
        this.name = 'QueryTooAmbiguousError';
    }
}
