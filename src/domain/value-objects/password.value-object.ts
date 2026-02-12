import { InvalidPasswordError } from '@domain/errors/invalid-password.error.js';

export class Password {
    private constructor(private readonly value: string) {}

    static create(value: string): Password {
        if (!Password.isValid(value)) {
            throw new InvalidPasswordError();
        }

        return new Password(value);
    }

    getValue(): string {
        return this.value;
    }

    private static isValid(value: string): boolean {
        if (value.length < 12) {
            return false;
        }

        if (/\s/.test(value)) {
            return false;
        }

        const hasUppercase = /[A-Z]/.test(value);
        const hasLowercase = /[a-z]/.test(value);
        const hasNumber = /\d/.test(value);
        const hasSymbol = /[^A-Za-z0-9]/.test(value);

        return hasUppercase && hasLowercase && hasNumber && hasSymbol;
    }
}
