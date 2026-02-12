import { randomUUID } from 'node:crypto';
import type { FileStorage, FileToStore, StoredFile, StoredFileContent } from '@application/ports/file-storage.js';
import { ok, fail, type Result } from '@shared/result.js';
import { PortError } from '@application/errors/port.error.js';

export class InMemoryFileStorage implements FileStorage {
    private readonly files = new Map<string, { metadata: StoredFile; content: Buffer }>();

    async store(file: FileToStore): Promise<Result<StoredFile, PortError>> {
        const storageKey = `invoices/${Date.now()}-${randomUUID()}`;
        const stored: StoredFile = {
            storageKey,
            filename: file.filename,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            checksum: file.checksum,
        };
        this.files.set(storageKey, { metadata: stored, content: file.content });
        return ok(stored);
    }

    async delete(storageKey: string): Promise<Result<void, PortError>> {
        this.files.delete(storageKey);
        return ok(undefined);
    }

    async get(storageKey: string): Promise<Result<StoredFileContent, PortError>> {
        const stored = this.files.get(storageKey);
        if (!stored) {
            return fail(new PortError('FileStorage', 'File not found'));
        }
        return ok({
            storageKey,
            filename: stored.metadata.filename,
            mimeType: stored.metadata.mimeType,
            sizeBytes: stored.metadata.sizeBytes,
            content: stored.content,
        });
    }
}
