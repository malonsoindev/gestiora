import type { Genkit } from 'genkit';
import { devLocalRetrieverRef } from '@genkit-ai/dev-local-vectorstore';
import { ok, fail, type Result } from '@shared/result.js';
import { PortError } from '@application/errors/port.error.js';
import type { RagRetrieveRequest, RagRetrievedDocument, RagRetriever } from '@application/ports/rag-retriever.js';
import type { Document } from 'genkit/retriever';

export type DevLocalRagRetrieverDependencies = {
    ai: Genkit;
    indexName: string;
};

export class DevLocalRagRetriever implements RagRetriever {
    constructor(private readonly dependencies: DevLocalRagRetrieverDependencies) {}

    async retrieve(request: RagRetrieveRequest): Promise<Result<RagRetrievedDocument[], PortError>> {
        try {
            const retriever = devLocalRetrieverRef(this.dependencies.indexName);
            const docs = await this.dependencies.ai.retrieve({
                retriever,
                query: request.query,
                options: { k: request.topK },
            });

            return ok(docs.map((doc) => this.mapDocument(doc)));
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('RagRetriever', 'Failed to retrieve documents', cause));
        }
    }

    private mapDocument(doc: Document): RagRetrievedDocument {
        const metadata = this.normalizeMetadata(doc.metadata);
        const score = this.readScore(doc.metadata);
        return {
            text: doc.text,
            ...(metadata ? { metadata } : {}),
            ...(score === undefined ? {} : { score }),
        };
    }

    private normalizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, string> | undefined {
        if (!metadata) {
            return undefined;
        }
        const entries = Object.entries(metadata)
            .map(([key, value]) => {
                if (typeof value === 'string' || typeof value === 'number') {
                    return [key, String(value)] as const;
                }
                return undefined;
            })
            .filter((entry): entry is readonly [string, string] => entry !== undefined);

        return entries.length > 0 ? Object.fromEntries(entries) : undefined;
    }

    private readScore(metadata: Record<string, unknown> | undefined): number | undefined {
        const score = metadata?.score;
        return typeof score === 'number' ? score : undefined;
    }
}
