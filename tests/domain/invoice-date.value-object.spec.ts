import { describe, expect, it } from 'vitest';
import { InvoiceDate } from '../../src/domain/value-objects/invoice-date.value-object.js';
import { InvalidInvoiceDateError } from '../../src/domain/errors/invalid-invoice-date.error.js';

describe('InvoiceDate', () => {
    it('accepts a valid YYYY-MM-DD date', () => {
        const date = InvoiceDate.create('2026-02-05');

        expect(date.getValue()).toBe('2026-02-05');
    });

    it('rejects invalid formats', () => {
        expect(() => InvoiceDate.create('2026/02/05')).toThrow(InvalidInvoiceDateError);
        expect(() => InvoiceDate.create('05-02-2026')).toThrow(InvalidInvoiceDateError);
    });

    it('rejects invalid calendar dates', () => {
        expect(() => InvoiceDate.create('2026-02-30')).toThrow(InvalidInvoiceDateError);
    });
});
