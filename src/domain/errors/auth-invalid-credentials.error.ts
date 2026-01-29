export class AuthInvalidCredentialsError extends Error {
    constructor(message: string = 'Invalid credentials') {
        super(message);
        this.name = 'AuthInvalidCredentialsError';
    }
}
