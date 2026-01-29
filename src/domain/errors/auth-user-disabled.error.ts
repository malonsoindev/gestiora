export class AuthUserDisabledError extends Error {
    constructor(message: string = 'User is disabled') {
        super(message);
        this.name = 'AuthUserDisabledError';
    }
}
