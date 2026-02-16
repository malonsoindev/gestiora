import { describe, expect, it } from 'vitest';
import { Email } from '@domain/value-objects/email.value-object.js';
import { InvalidEmailError } from '@domain/errors/invalid-email.error.js';

describe('Email', () => {
    it('normalizes email by trimming and lowercasing', () => {
        const email = Email.create('  USER@Example.COM ');

        expect(email.getValue()).toBe('user@example.com');
    });

    it('rejects invalid email format', () => {
        expect(() => Email.create('not-an-email')).toThrow(InvalidEmailError);
    });

    it('equals returns true for same value', () => {
        const email1 = Email.create('user@example.com');
        const email2 = Email.create('USER@EXAMPLE.COM');

        expect(email1.equals(email2)).toBe(true);
    });

    it('equals returns false for different values', () => {
        const email1 = Email.create('user@example.com');
        const email2 = Email.create('other@example.com');

        expect(email1.equals(email2)).toBe(false);
    });
});
