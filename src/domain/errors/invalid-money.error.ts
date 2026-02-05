export class InvalidMoneyError extends Error {
    constructor(message: string = 'Invalid money amount') {
        super(message);
        this.name = 'InvalidMoneyError';
    }
}
