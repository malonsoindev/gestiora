import { describe, expect, it } from 'vitest';
import { Email } from '../../src/domain/value-objects/email.value-object.js';
import { InvalidEmailError } from '../../src/domain/errors/invalid-email.error.js';

describe('Email', () => {
    it('normalizes email by trimming and lowercasing', () => {
        const email = Email.create('  USER@Example.COM ');

        expect(email.getValue()).toBe('user@example.com');
    });

    it('rejects invalid email format', () => {
        expect(() => Email.create('not-an-email')).toThrow(InvalidEmailError);
    });
});
