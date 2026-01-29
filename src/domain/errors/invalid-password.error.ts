export class InvalidPasswordError extends Error {
    constructor(message: string = 'Password does not meet security requirements') {
        super(message);
        this.name = 'InvalidPasswordError';
    }
}
