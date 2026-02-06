import { randomUUID } from 'node:crypto';
import type { FileStorage, FileToStore, StoredFile } from '../../../application/ports/file-storage.js';
import { ok, type Result } from '../../../shared/result.js';
import type { PortError } from '../../../application/errors/port.error.js';

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
}
