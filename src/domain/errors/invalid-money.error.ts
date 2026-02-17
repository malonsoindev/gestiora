import { DomainError } from '@domain/errors/domain.error.js';

export class InvalidMoneyError extends DomainError {
    constructor(message: string = 'Invalid money amount') {
        super(message, 'InvalidMoneyError');
    }
}
