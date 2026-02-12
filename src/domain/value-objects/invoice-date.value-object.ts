import { InvalidInvoiceDateError } from '@domain/errors/invalid-invoice-date.error.js';

export class InvoiceDate {
    private constructor(private readonly value: string) {}

    static create(value: string): InvoiceDate {
        if (!InvoiceDate.isValid(value)) {
            throw new InvalidInvoiceDateError();
        }
        return new InvoiceDate(value);
    }

    getValue(): string {
        return this.value;
    }

    private static isValid(value: string): boolean {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return false;
        }
        const parts = value.split('-');
        if (parts.length !== 3) {
            return false;
        }
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
            return false;
        }
        const date = new Date(Date.UTC(year, month - 1, day));
        return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    }
}
