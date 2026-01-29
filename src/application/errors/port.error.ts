export class PortError extends Error {
    constructor(
        public readonly port: string,
        message: string = 'Port error',
        public readonly cause?: Error,
    ) {
        super(message);
        this.name = 'PortError';
    }
}
