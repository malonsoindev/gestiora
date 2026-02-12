import type { FileStorage, StoredFile, StoredFileContent } from '@application/ports/file-storage.js';
import { ok } from '@shared/result.js';

export type FileStorageStubOptions = Partial<{
    storeResult: StoredFile;
    getResult: StoredFileContent;
}>;

const defaultStoreResult: StoredFile = {
    storageKey: 'invoices/2026/02/invoice-1.pdf',
    filename: 'invoice-1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1234,
    checksum: 'checksum-1',
};

const defaultGetResult: StoredFileContent = {
    storageKey: 'invoices/2026/02/invoice-1.pdf',
    filename: 'invoice-1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1234,
    content: Buffer.from('pdf-content'),
};

export class FileStorageStub implements FileStorage {
    deletedStorageKey: string | null = null;
    private readonly storeResult: StoredFile;
    private readonly getResult: StoredFileContent;

    constructor(options: FileStorageStubOptions = {}) {
        this.storeResult = options.storeResult ?? defaultStoreResult;
        this.getResult = options.getResult ?? defaultGetResult;
    }

    async store() {
        return ok(this.storeResult);
    }

    async delete(storageKey: string) {
        this.deletedStorageKey = storageKey;
        return ok(undefined);
    }

    async get(storageKey: string) {
        return ok({ ...this.getResult, storageKey });
    }
}
