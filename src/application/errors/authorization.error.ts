export class AuthorizationError extends Error {
    constructor(message: string = 'Access denied') {
        super(message);
        this.name = 'AuthorizationError';
    }
}
