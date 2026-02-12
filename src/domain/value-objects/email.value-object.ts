import { InvalidEmailError } from '@domain/errors/invalid-email.error.js';

export class Email {
    private constructor(private readonly value: string) {}

    static create(raw: string): Email {
        const normalized = raw.trim().toLowerCase();
        if (!Email.isValid(normalized)) {
            throw new InvalidEmailError();
        }
        return new Email(normalized);
    }

    getValue(): string {
        return this.value;
    }

    private static isValid(value: string): boolean {
        if (value.length > 254) {
            return false;
        }

        // Keep a simple regex without nested quantifiers to avoid ReDoS risk.
        // We rely on the length cap (254) for a cheap upper bound and basic structure check here.
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
}
