import type { Result } from '../../shared/result.js';
import type { PortError } from '../errors/port.error.js';

export type StoredFile = {
    storageKey: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    checksum: string;
};

export type FileToStore = {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    checksum: string;
    content: Buffer;
};

export interface FileStorage {
    store(file: FileToStore): Promise<Result<StoredFile, PortError>>;
    delete(storageKey: string): Promise<Result<void, PortError>>;
}
