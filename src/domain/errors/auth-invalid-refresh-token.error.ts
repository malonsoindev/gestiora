export class AuthInvalidRefreshTokenError extends Error {
    constructor(message: string = 'Invalid refresh token') {
        super(message);
        this.name = 'AuthInvalidRefreshTokenError';
    }
}
