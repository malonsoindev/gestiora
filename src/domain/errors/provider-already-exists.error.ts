export class ProviderAlreadyExistsError extends Error {
    constructor(message: string = 'Provider already exists') {
        super(message);
        this.name = 'ProviderAlreadyExistsError';
    }
}
