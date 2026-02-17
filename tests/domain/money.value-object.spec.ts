import { describe, expect, it } from 'vitest';
import { Money } from '@domain/value-objects/money.value-object.js';
import { InvalidMoneyError } from '@domain/errors/invalid-money.error.js';

describe('Money', () => {
    it('accepts zero and positive values', () => {
        expect(Money.create(0).getValue()).toBe(0);
        expect(Money.create(10.5).getValue()).toBe(10.5);
    });

    it('rejects negative or non-finite values', () => {
        expect(() => Money.create(-1)).toThrow(InvalidMoneyError);
        expect(() => Money.create(Number.NaN)).toThrow(InvalidMoneyError);
        expect(() => Money.create(Number.POSITIVE_INFINITY)).toThrow(InvalidMoneyError);
    });

    it('equals returns true for same value', () => {
        const money1 = Money.create(100.5);
        const money2 = Money.create(100.5);

        expect(money1.equals(money2)).toBe(true);
    });

    it('equals returns false for different values', () => {
        const money1 = Money.create(100.5);
        const money2 = Money.create(200);

        expect(money1.equals(money2)).toBe(false);
    });
});
