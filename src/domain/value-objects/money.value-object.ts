import { InvalidMoneyError } from '@domain/errors/invalid-money.error.js';

export class Money {
    private constructor(private readonly value: number) {}

    static create(value: number): Money {
        if (!Number.isFinite(value) || value < 0) {
            throw new InvalidMoneyError();
        }
        return new Money(value);
    }

    getValue(): number {
        return this.value;
    }

    equals(other: Money): boolean {
        return this.value === other.value;
    }
}
