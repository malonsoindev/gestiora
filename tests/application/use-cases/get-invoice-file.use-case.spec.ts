import { describe, expect, it } from 'vitest';
import { GetInvoiceFileUseCase } from '@application/use-cases/get-invoice-file.use-case.js';
import type { FileStorage } from '@application/ports/file-storage.js';
import { Invoice, InvoiceStatus } from '@domain/entities/invoice.entity.js';
import type { InvoiceProps } from '@domain/entities/invoice.entity.js';
import { FileRef } from '@domain/value-objects/file-ref.value-object.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import { InvalidInvoiceStatusError } from '@domain/errors/invalid-invoice-status.error.js';
import { ok } from '@shared/result.js';
import { InvoiceRepositoryStub } from '@tests/shared/stubs/invoice-repository.stub.js';
import { createTestInvoice } from '@tests/shared/fixtures/invoice.fixture.js';

const fixedNow = new Date('2026-02-23T10:00:00.000Z');

class FileStorageStub implements FileStorage {
    async store() {
        return ok({
            storageKey: 'invoices/2026/02/invoice-1.pdf',
            filename: 'invoice-1.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1234,
            checksum: 'checksum-1',
        });
    }

    async delete() {
        return ok(undefined);
    }

    async get(storageKey: string) {
        return ok({
            storageKey,
            filename: 'invoice-1.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1234,
            content: Buffer.from('pdf-content'),
        });
    }
}

const createInvoice = (overrides: Partial<InvoiceProps> = {}): Invoice =>
    createTestInvoice({
        now: fixedNow,
        overrides: {
            status: InvoiceStatus.Active,
            fileRef: FileRef.create({
                storageKey: 'invoices/2026/02/invoice-1.pdf',
                filename: 'invoice-1.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 1234,
                checksum: 'checksum-1',
            }),
            ...overrides,
        },
    });

describe('GetInvoiceFileUseCase', () => {
    it('returns file content when invoice has fileRef', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(createInvoice());
        const fileStorage = new FileStorageStub();
        const useCase = new GetInvoiceFileUseCase({ invoiceRepository, fileStorage });

        const result = await useCase.execute({ invoiceId: 'invoice-1' });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.filename).toBe('invoice-1.pdf');
            expect(result.value.mimeType).toBe('application/pdf');
        }
    });

    it('returns not found when invoice does not exist', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(null);
        const fileStorage = new FileStorageStub();
        const useCase = new GetInvoiceFileUseCase({ invoiceRepository, fileStorage });

        const result = await useCase.execute({ invoiceId: 'missing' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvoiceNotFoundError);
        }
    });

    it('rejects when invoice is deleted', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(
            createInvoice({
                status: InvoiceStatus.Deleted,
                deletedAt: new Date('2026-02-12T10:00:00.000Z'),
            }),
        );
        const fileStorage = new FileStorageStub();
        const useCase = new GetInvoiceFileUseCase({ invoiceRepository, fileStorage });

        const result = await useCase.execute({ invoiceId: 'invoice-1' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidInvoiceStatusError);
        }
    });
});
