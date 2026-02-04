export class InvalidCifError extends Error {
    constructor(message: string = 'Invalid CIF') {
        super(message);
        this.name = 'InvalidCifError';
    }
}
