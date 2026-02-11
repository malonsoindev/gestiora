import type { Result } from '../../shared/result.js';
import type { PortError } from '../errors/port.error.js';

export type RagDocument = {
    text: string;
    metadata?: Record<string, string>;
};

export interface RagIndexer {
    index(documents: RagDocument[]): Promise<Result<void, PortError>>;
}
