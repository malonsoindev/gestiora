import { ok, fail, type Result } from '../../shared/result.js';
import type { PortError } from '../errors/port.error.js';
import type { RagRetriever } from '../ports/rag-retriever.js';
import type { RagAnswerGenerator } from '../ports/rag-answer-generator.js';

export type QueryInvoicesRagRequest = {
    query: string;
};

export type QueryInvoicesRagResponse = {
    answer: string;
    references: Array<{ documentId: string; snippets: string[] }>;
};

export type QueryInvoicesRagDependencies = {
    ragRetriever: RagRetriever;
    ragAnswerGenerator: RagAnswerGenerator;
    topK: number;
};

export type QueryInvoicesRagError = PortError;

export class QueryInvoicesRagUseCase {
    constructor(private readonly dependencies: QueryInvoicesRagDependencies) {}

    async execute(
        request: QueryInvoicesRagRequest,
    ): Promise<Result<QueryInvoicesRagResponse, QueryInvoicesRagError>> {
        const retrieveResult = await this.dependencies.ragRetriever.retrieve({
            query: request.query,
            topK: this.dependencies.topK,
        });
        if (!retrieveResult.success) {
            return fail(retrieveResult.error);
        }

        const generateResult = await this.dependencies.ragAnswerGenerator.generate({
            query: request.query,
            documents: retrieveResult.value,
        });
        if (!generateResult.success) {
            return fail(generateResult.error);
        }

        return ok({
            answer: generateResult.value,
            references: this.buildReferences(retrieveResult.value),
        });
    }

    private buildReferences(documents: Array<{ text: string; metadata?: Record<string, string> }>) {
        return documents.map((doc, index) => ({
            documentId: this.buildDocumentId(doc.metadata, index),
            snippets: this.buildSnippets(doc.text),
        }));
    }

    private buildDocumentId(metadata: Record<string, string> | undefined, index: number): string {
        const baseId = metadata?.invoiceId ?? `doc-${index + 1}`;
        const chunkType = metadata?.chunkType;
        const chunkIndex = metadata?.chunkIndex;
        const suffixParts = [chunkType, chunkIndex].filter(
            (value): value is string => typeof value === 'string' && value.length > 0,
        );
        if (suffixParts.length === 0) {
            return baseId;
        }
        return `${baseId}:${suffixParts.join(':')}`;
    }

    private buildSnippets(text: string): string[] {
        const trimmed = text.trim();
        if (trimmed.length === 0) {
            return [];
        }
        const maxLength = 240;
        const snippet = trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}...` : trimmed;
        return [snippet];
    }
}
