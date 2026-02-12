import { describe, expect, it } from 'vitest';
import { QueryInvoicesRagUseCase } from '../../../src/application/use-cases/query-invoices-rag.use-case.js';
import type { RagRetriever, RagRetrievedDocument } from '../../../src/application/ports/rag-retriever.js';
import type { RagAnswerGenerator } from '../../../src/application/ports/rag-answer-generator.js';
import { PortError } from '../../../src/application/errors/port.error.js';
import { ok, fail, type Result } from '../../../src/shared/result.js';

class RagRetrieverStub implements RagRetriever {
    private readonly documents: RagRetrievedDocument[];
    private readonly shouldFail: boolean;

    constructor(documents: RagRetrievedDocument[], shouldFail = false) {
        this.documents = documents;
        this.shouldFail = shouldFail;
    }

    async retrieve(_request: { query: string; topK: number }): Promise<Result<RagRetrievedDocument[], PortError>> {
        if (this.shouldFail) {
            return fail(new PortError('RagRetriever', 'Retrieve failed'));
        }
        return ok(this.documents);
    }
}

class RagAnswerGeneratorStub implements RagAnswerGenerator {
    private readonly answer: string;
    private readonly shouldFail: boolean;

    constructor(answer: string, shouldFail = false) {
        this.answer = answer;
        this.shouldFail = shouldFail;
    }

    async generate(_request: { query: string; documents: RagRetrievedDocument[] }): Promise<Result<string, PortError>> {
        if (this.shouldFail) {
            return fail(new PortError('RagAnswerGenerator', 'Generate failed'));
        }
        return ok(this.answer);
    }
}

describe('QueryInvoicesRagUseCase', () => {
    it('returns an answer based on retrieved documents', async () => {
        const retriever = new RagRetrieverStub([
            { text: '{"invoice":{"fechaOperacion":"2026-02-10","total":100},"provider":{"razonSocial":"Proveedor Demo"}}', metadata: { invoiceId: 'invoice-1' } },
            { text: '{"invoice":{"fechaOperacion":"2026-02-11","total":200},"provider":{"razonSocial":"Proveedor Demo"}}', metadata: { invoiceId: 'invoice-1' } },
        ]);
        const generator = new RagAnswerGeneratorStub('respuesta');
        const useCase = new QueryInvoicesRagUseCase({
            ragRetriever: retriever,
            ragAnswerGenerator: generator,
            topK: 5,
        });

        const result = await useCase.execute({ query: 'total factura' });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.answer).toBe('respuesta');
            expect(result.value.references).toHaveLength(1);
            expect(result.value.references[0]?.documentId).toBe('invoice-1');
            expect(result.value.references[0]?.snippets.length).toBe(2);
        }
    });

    it('applies provider and date filters', async () => {
        const retriever = new RagRetrieverStub([
            { text: '{"invoice":{"fechaOperacion":"2026-02-10","total":100},"provider":{"razonSocial":"Proveedor Demo"}}', metadata: { invoiceId: 'invoice-1' } },
            { text: '{"invoice":{"fechaOperacion":"2026-02-12","total":100},"provider":{"razonSocial":"Otro"}}', metadata: { invoiceId: 'invoice-2' } },
        ]);
        const generator = new RagAnswerGeneratorStub('respuesta');
        const useCase = new QueryInvoicesRagUseCase({
            ragRetriever: retriever,
            ragAnswerGenerator: generator,
            topK: 5,
        });

        const result = await useCase.execute({
            query: 'facturas',
            filters: {
                providerName: 'proveedor demo',
                dateFrom: '2026-02-10',
                dateTo: '2026-02-11',
            },
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.references).toHaveLength(1);
            expect(result.value.references[0]?.documentId).toBe('invoice-1');
        }
    });

    it('returns an error when retrieval fails', async () => {
        const retriever = new RagRetrieverStub([], true);
        const generator = new RagAnswerGeneratorStub('respuesta');
        const useCase = new QueryInvoicesRagUseCase({
            ragRetriever: retriever,
            ragAnswerGenerator: generator,
            topK: 5,
        });

        const result = await useCase.execute({ query: 'total factura' });

        expect(result.success).toBe(false);
    });

    it('returns an error when generation fails', async () => {
        const retriever = new RagRetrieverStub([
            { text: 'doc-1', metadata: { invoiceId: 'invoice-1' } },
        ]);
        const generator = new RagAnswerGeneratorStub('respuesta', true);
        const useCase = new QueryInvoicesRagUseCase({
            ragRetriever: retriever,
            ragAnswerGenerator: generator,
            topK: 5,
        });

        const result = await useCase.execute({ query: 'total factura' });

        expect(result.success).toBe(false);
    });
});
