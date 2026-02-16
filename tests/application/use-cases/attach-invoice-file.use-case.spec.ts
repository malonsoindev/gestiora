import { describe, expect, it } from 'vitest';
import { AttachInvoiceFileUseCase } from '@application/use-cases/attach-invoice-file.use-case.js';
import type { FileStorage } from '@application/ports/file-storage.js';
import { Invoice, InvoiceStatus } from '@domain/entities/invoice.entity.js';
import type { InvoiceProps } from '@domain/entities/invoice.entity.js';
import { FileRef } from '@domain/value-objects/file-ref.value-object.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import { InvalidInvoiceStatusError } from '@domain/errors/invalid-invoice-status.error.js';
import { ok } from '@shared/result.js';
import { RagReindexInvoiceServiceStub } from '@tests/application/stubs/rag-reindex-invoice.service.stub.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import { fixedNow } from '@tests/shared/fixed-now.js';
import { InvoiceRepositoryStub } from '@tests/shared/stubs/invoice-repository.stub.js';
import { createTestInvoice } from '@tests/shared/fixtures/invoice.fixture.js';

class FileStorageStub implements FileStorage {
    deletedStorageKey: string | null = null;

    async store() {
        return ok({
            storageKey: 'invoices/2026/02/invoice-1.pdf',
            filename: 'invoice-1.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1234,
            checksum: 'checksum-1',
        });
    }

    async delete(storageKey: string) {
        this.deletedStorageKey = storageKey;
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
        overrides,
    });

const fileInput = {
    filename: 'invoice-1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1234,
    checksum: 'checksum-1',
    content: Buffer.from('pdf-content'),
};

type SutOverrides = Partial<{
    invoice: Invoice | null;
    now: Date;
}>;

const makeSut = (overrides: SutOverrides = {}) => {
    const now = overrides.now ?? fixedNow;
    const invoice = overrides.invoice === undefined ? createInvoice() : overrides.invoice;
    const invoiceRepository = new InvoiceRepositoryStub(invoice);
    const auditLogger = new AuditLoggerSpy();
    const fileStorage = new FileStorageStub();

    const useCase = new AttachInvoiceFileUseCase({
        invoiceRepository,
        fileStorage,
        auditLogger,
        dateProvider: new DateProviderStub(now),
        ragReindexInvoiceService: new RagReindexInvoiceServiceStub(),
    });

    return {
        useCase,
        invoiceRepository,
        auditLogger,
        fileStorage,
    };
};

describe('AttachInvoiceFileUseCase', () => {
    it('attaches a file to a draft invoice and audits the action', async () => {
        const { useCase, invoiceRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
            file: fileInput,
        });

        expect(result.success).toBe(true);
        expect(invoiceRepository.updatedInvoice?.status).toBe(InvoiceStatus.Active);
        expect(invoiceRepository.updatedInvoice?.fileRef?.storageKey).toBe('invoices/2026/02/invoice-1.pdf');
        expect(auditLogger.events.some((event) => event.action === 'INVOICE_FILE_ATTACHED')).toBe(true);
    });

    it('deletes previous file when invoice already has a fileRef', async () => {
        const { useCase, fileStorage } = makeSut({
            invoice: createInvoice({
                status: InvoiceStatus.Active,
                fileRef: FileRef.create({
                    storageKey: 'invoices/2026/01/old.pdf',
                    filename: 'old.pdf',
                    mimeType: 'application/pdf',
                    sizeBytes: 100,
                    checksum: 'old-checksum',
                }),
            }),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
            file: fileInput,
        });

        expect(result.success).toBe(true);
        expect(fileStorage.deletedStorageKey).toBe('invoices/2026/01/old.pdf');
    });

    it('rejects when invoice does not exist', async () => {
        const { useCase, invoiceRepository, auditLogger } = makeSut({ invoice: null });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'missing-invoice',
            file: fileInput,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvoiceNotFoundError);
        }
        expect(invoiceRepository.updatedInvoice).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects when invoice is deleted', async () => {
        const { useCase, invoiceRepository, auditLogger } = makeSut({
            invoice: createInvoice({
                status: InvoiceStatus.Deleted,
                deletedAt: new Date('2026-02-12T10:00:00.000Z'),
            }),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
            file: fileInput,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidInvoiceStatusError);
        }
        expect(invoiceRepository.updatedInvoice).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });
});
