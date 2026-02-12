import type { Result } from '@shared/result.js';
import type { PortError } from '@application/errors/port.error.js';

export type RagRetrievedDocument = {
    text: string;
    metadata?: Record<string, string>;
    score?: number;
};

export type RagRetrieveRequest = {
    query: string;
    topK: number;
};

export interface RagRetriever {
    retrieve(request: RagRetrieveRequest): Promise<Result<RagRetrievedDocument[], PortError>>;
}
