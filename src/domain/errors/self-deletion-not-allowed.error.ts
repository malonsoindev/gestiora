export class SelfDeletionNotAllowedError extends Error {
    constructor(message: string = 'Self deletion is not allowed') {
        super(message);
        this.name = 'SelfDeletionNotAllowedError';
    }
}
