import { describe, expect, it } from 'vitest';
import { FileRef } from '@domain/value-objects/file-ref.value-object.js';
import { InvalidFileRefError } from '@domain/errors/invalid-file-ref.error.js';

describe('FileRef', () => {
    it('creates a file ref with valid data', () => {
        const fileRef = FileRef.create({
            storageKey: 'invoices/2026/02/fac-1.pdf',
            filename: 'factura-1.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 2048,
            checksum: 'checksum-1',
        });

        expect(fileRef.storageKey).toBe('invoices/2026/02/fac-1.pdf');
        expect(fileRef.filename).toBe('factura-1.pdf');
        expect(fileRef.mimeType).toBe('application/pdf');
        expect(fileRef.sizeBytes).toBe(2048);
        expect(fileRef.checksum).toBe('checksum-1');
    });

    it('rejects missing required fields', () => {
        expect(() =>
            FileRef.create({
                storageKey: '',
                filename: 'factura-1.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 2048,
                checksum: 'checksum-1',
            }),
        ).toThrow(InvalidFileRefError);

        expect(() =>
            FileRef.create({
                storageKey: 'invoices/2026/02/fac-1.pdf',
                filename: '',
                mimeType: 'application/pdf',
                sizeBytes: 2048,
                checksum: 'checksum-1',
            }),
        ).toThrow(InvalidFileRefError);
    });

    it('rejects invalid size and checksum', () => {
        expect(() =>
            FileRef.create({
                storageKey: 'invoices/2026/02/fac-1.pdf',
                filename: 'factura-1.pdf',
                mimeType: 'application/pdf',
                sizeBytes: -1,
                checksum: 'checksum-1',
            }),
        ).toThrow(InvalidFileRefError);

        expect(() =>
            FileRef.create({
                storageKey: 'invoices/2026/02/fac-1.pdf',
                filename: 'factura-1.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 2048,
                checksum: '',
            }),
        ).toThrow(InvalidFileRefError);
    });

    it('equals returns true for same values', () => {
        const fileRef1 = FileRef.create({
            storageKey: 'invoices/2026/02/fac-1.pdf',
            filename: 'factura-1.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 2048,
            checksum: 'checksum-1',
        });
        const fileRef2 = FileRef.create({
            storageKey: 'invoices/2026/02/fac-1.pdf',
            filename: 'factura-1.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 2048,
            checksum: 'checksum-1',
        });

        expect(fileRef1.equals(fileRef2)).toBe(true);
    });

    it('equals returns false for different values', () => {
        const fileRef1 = FileRef.create({
            storageKey: 'invoices/2026/02/fac-1.pdf',
            filename: 'factura-1.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 2048,
            checksum: 'checksum-1',
        });
        const fileRef2 = FileRef.create({
            storageKey: 'invoices/2026/02/fac-2.pdf',
            filename: 'factura-2.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 4096,
            checksum: 'checksum-2',
        });

        expect(fileRef1.equals(fileRef2)).toBe(false);
    });
});
