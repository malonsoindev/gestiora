export class InvalidFileRefError extends Error {
    constructor(message: string = 'Invalid file ref') {
        super(message);
        this.name = 'InvalidFileRefError';
    }
}
