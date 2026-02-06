import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FileStorage, FileToStore, StoredFile } from '../../../application/ports/file-storage.js';
import { ok, fail, type Result } from '../../../shared/result.js';
import { PortError } from '../../../application/errors/port.error.js';

export class LocalFileStorage implements FileStorage {
    constructor(private readonly basePath: string) {}

    async store(file: FileToStore): Promise<Result<StoredFile, PortError>> {
        try {
            const extension = path.extname(file.filename);
            const filename = `${Date.now()}-${randomUUID()}${extension}`;
            const directory = path.join(this.basePath, 'invoices');
            await mkdir(directory, { recursive: true });
            const fullPath = path.join(directory, filename);
            await writeFile(fullPath, file.content);

            return ok({
                storageKey: path.posix.join('invoices', filename),
                filename: file.filename,
                mimeType: file.mimeType,
                sizeBytes: file.sizeBytes,
                checksum: file.checksum,
            });
        } catch (error) {
            return fail(new PortError('FileStorage', 'Failed to store file', error as Error));
        }
    }

    async delete(storageKey: string): Promise<Result<void, PortError>> {
        try {
            const normalized = storageKey.split('/').join(path.sep);
            const fullPath = path.join(this.basePath, normalized);
            await unlink(fullPath);
            return ok(undefined);
        } catch (error) {
            return fail(new PortError('FileStorage', 'Failed to delete file', error as Error));
        }
    }
}
