import type { Genkit } from 'genkit';
import { Document } from 'genkit/retriever';
import { devLocalIndexerRef } from '@genkit-ai/dev-local-vectorstore';
import { ok, fail, type Result } from '@shared/result.js';
import { PortError } from '@application/errors/port.error.js';
import type { RagDocument, RagIndexer } from '@application/ports/rag-indexer.js';

export type DevLocalRagIndexerDependencies = {
    ai: Genkit;
    indexName: string;
};

export class DevLocalRagIndexer implements RagIndexer {
    constructor(private readonly dependencies: DevLocalRagIndexerDependencies) {}

    async index(documents: RagDocument[]): Promise<Result<void, PortError>> {
        try {
            const indexer = devLocalIndexerRef(this.dependencies.indexName);
            const indexedDocuments = documents.map((doc) => Document.fromText(doc.text, doc.metadata));
            await this.dependencies.ai.index({
                indexer,
                documents: indexedDocuments,
            });
            return ok(undefined);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('RagIndexer', 'Failed to index documents', cause));
        }
    }
}
