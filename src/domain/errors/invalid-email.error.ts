export class InvalidEmailError extends Error {
    constructor(message: string = 'Invalid email') {
        super(message);
        this.name = 'InvalidEmailError';
    }
}
