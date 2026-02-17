import { ok, fail, type Result } from '@shared/result.js';
import { normalizeText } from '@shared/text-utils.js';
import type { PortError } from '@application/errors/port.error.js';
import type { RagRetriever } from '@application/ports/rag-retriever.js';
import type { RagAnswerGenerator } from '@application/ports/rag-answer-generator.js';
import type { QueryInvoicesRagRequest } from '@application/dto/query-invoices-rag.request.js';
import type { QueryInvoicesRagResponse } from '@application/dto/query-invoices-rag.response.js';

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

        const filteredDocs = this.applyFilters(retrieveResult.value, request.filters);

        const generateResult = await this.dependencies.ragAnswerGenerator.generate({
            query: request.query,
            documents: filteredDocs,
        });
        if (!generateResult.success) {
            return fail(generateResult.error);
        }

        return ok({
            answer: generateResult.value,
            references: this.buildReferences(filteredDocs),
        });
    }

    private buildReferences(documents: Array<{ text: string; metadata?: Record<string, string> }>) {
        const grouped = new Map<string, string[]>();

        documents.forEach((doc, index) => {
            const documentId = this.buildDocumentId(doc.metadata, index);
            const snippets = this.buildSnippets(doc.text);
            if (snippets.length === 0) {
                return;
            }
            const existing = grouped.get(documentId) ?? [];
            grouped.set(documentId, existing.concat(snippets));
        });

        return Array.from(grouped.entries()).map(([documentId, snippets]) => ({
            documentId,
            snippets,
        }));
    }

    private buildDocumentId(metadata: Record<string, string> | undefined, index: number): string {
        return metadata?.invoiceId ?? `doc-${index + 1}`;
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

    private applyFilters(
        documents: Array<{ text: string; metadata?: Record<string, string> }>,
        filters: {
            providerName?: string;
            dateFrom?: string;
            dateTo?: string;
            minTotal?: number;
            maxTotal?: number;
        } | undefined,
    ) {
        if (!filters) {
            return documents;
        }
        return documents.filter((doc) => this.matchesFilters(doc.text, filters));
    }

    private matchesFilters(
        text: string,
        filters: {
            providerName?: string;
            dateFrom?: string;
            dateTo?: string;
            minTotal?: number;
            maxTotal?: number;
        },
    ): boolean {
        const payload = this.parseInvoicePayload(text);
        if (!payload) {
            return false;
        }
        return (
            this.matchesProvider(payload, filters) &&
            this.matchesDate(payload, filters) &&
            this.matchesTotal(payload, filters)
        );
    }

    private matchesProvider(
        payload: { providerName: string },
        filters: { providerName?: string },
    ): boolean {
        if (!filters.providerName) {
            return true;
        }
        const providerName = normalizeText(payload.providerName);
        const expected = normalizeText(filters.providerName);
        return providerName.includes(expected);
    }

    private matchesDate(
        payload: { fechaOperacion?: string | undefined },
        filters: { dateFrom?: string; dateTo?: string },
    ): boolean {
        if (!filters.dateFrom && !filters.dateTo) {
            return true;
        }
        const invoiceDate = payload.fechaOperacion;
        if (!invoiceDate) {
            return false;
        }
        if (filters.dateFrom && invoiceDate < filters.dateFrom) {
            return false;
        }
        if (filters.dateTo && invoiceDate > filters.dateTo) {
            return false;
        }
        return true;
    }

    private matchesTotal(
        payload: { total?: number | undefined },
        filters: { minTotal?: number; maxTotal?: number },
    ): boolean {
        if (filters.minTotal === undefined && filters.maxTotal === undefined) {
            return true;
        }
        const total = payload.total;
        if (total === undefined) {
            return false;
        }
        if (filters.minTotal !== undefined && total < filters.minTotal) {
            return false;
        }
        if (filters.maxTotal !== undefined && total > filters.maxTotal) {
            return false;
        }
        return true;
    }

    private parseInvoicePayload(text: string): {
        providerName: string;
        fechaOperacion?: string | undefined;
        total?: number | undefined;
    } | null {
        try {
            const parsed = JSON.parse(text) as {
                invoice?: { fechaOperacion?: string; total?: number };
                provider?: { razonSocial?: string } | null;
            };
            const providerName = parsed.provider?.razonSocial ?? '';
            return {
                providerName,
                ...(parsed.invoice?.fechaOperacion === undefined
                    ? {}
                    : { fechaOperacion: parsed.invoice.fechaOperacion }),
                ...(parsed.invoice?.total === undefined ? {} : { total: parsed.invoice.total }),
            };
        } catch {
            return null;
        }
    }
}

