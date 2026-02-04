export class InvalidProviderStatusError extends Error {
    constructor(message: string = 'Invalid provider status') {
        super(message);
        this.name = 'InvalidProviderStatusError';
    }
}
