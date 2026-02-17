import { describe, expect, it } from 'vitest';
import { Cif } from '@domain/value-objects/cif.value-object.js';
import { InvalidCifError } from '@domain/errors/invalid-cif.error.js';

describe('Cif', () => {
    it('normalizes by trimming, uppercasing, and removing spaces and hyphens', () => {
        const cif = Cif.create('  b-123 456 78 ');

        expect(cif.getValue()).toBe('B12345678');
    });

    it('rejects invalid cif format', () => {
        expect(() => Cif.create('12345678')).toThrow(InvalidCifError);
    });

    it('rejects cif without a trailing digit', () => {
        expect(() => Cif.create('B1234567A')).toThrow(InvalidCifError);
    });

    it('equals returns true for same value', () => {
        const cif1 = Cif.create('B12345678');
        const cif2 = Cif.create('b-123 456 78');

        expect(cif1.equals(cif2)).toBe(true);
    });

    it('equals returns false for different values', () => {
        const cif1 = Cif.create('B12345678');
        const cif2 = Cif.create('A98765432');

        expect(cif1.equals(cif2)).toBe(false);
    });
});
