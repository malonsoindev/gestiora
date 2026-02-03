export class InvalidUserStatusError extends Error {
    constructor(message: string = 'User status is invalid') {
        super(message);
        this.name = 'InvalidUserStatusError';
    }
}
