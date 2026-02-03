import { InvalidEmailError } from '../errors/invalid-email.error.js';

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
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
}
