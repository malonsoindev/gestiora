export class ProviderNotFoundError extends Error {
    constructor(message: string = 'Provider not found') {
        super(message);
        this.name = 'ProviderNotFoundError';
    }
}
