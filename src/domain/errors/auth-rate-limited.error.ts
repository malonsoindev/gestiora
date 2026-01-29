export class AuthRateLimitedError extends Error {
    constructor(message: string = 'Too many attempts') {
        super(message);
        this.name = 'AuthRateLimitedError';
    }
}
