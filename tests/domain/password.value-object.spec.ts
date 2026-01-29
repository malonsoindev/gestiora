import { describe, expect, it } from 'vitest';
import { Password } from '../../src/domain/value-objects/password.value-object.js';
import { InvalidPasswordError } from '../../src/domain/errors/invalid-password.error.js';

describe('Password', () => {
    it('accepts a valid password', () => {
        const password = Password.create('StrongPass1!');

        expect(password.getValue()).toBe('StrongPass1!');
    });

    it('rejects passwords shorter than 12 characters', () => {
        expect(() => Password.create('Short1!')).toThrow(InvalidPasswordError);
    });

    it('rejects passwords without uppercase letters', () => {
        expect(() => Password.create('lowercasepass1!')).toThrow(InvalidPasswordError);
    });

    it('rejects passwords without lowercase letters', () => {
        expect(() => Password.create('UPPERCASE1!')).toThrow(InvalidPasswordError);
    });

    it('rejects passwords without numbers', () => {
        expect(() => Password.create('NoNumberPass!')).toThrow(InvalidPasswordError);
    });

    it('rejects passwords without symbols', () => {
        expect(() => Password.create('NoSymbolPass1')).toThrow(InvalidPasswordError);
    });

    it('rejects passwords with spaces', () => {
        expect(() => Password.create('No Spaces1!')).toThrow(InvalidPasswordError);
    });
});
