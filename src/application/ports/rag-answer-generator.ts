import type { Result } from '@shared/result.js';
import type { PortError } from '@application/errors/port.error.js';
import type { RagRetrievedDocument } from '@application/ports/rag-retriever.js';

export type RagGenerateRequest = {
    query: string;
    documents: RagRetrievedDocument[];
};

export interface RagAnswerGenerator {
    generate(request: RagGenerateRequest): Promise<Result<string, PortError>>;
}
