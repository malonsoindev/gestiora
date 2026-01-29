export class AuthUserLockedError extends Error {
    constructor(message: string = 'User is locked') {
        super(message);
        this.name = 'AuthUserLockedError';
    }
}
