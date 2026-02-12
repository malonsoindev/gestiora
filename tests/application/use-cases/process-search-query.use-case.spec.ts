import { describe, expect, it } from 'vitest';
import { ProcessSearchQueryUseCase } from '@application/use-cases/process-search-query.use-case.js';
import type { SearchQueryRepository, SearchQueryRecord } from '@application/ports/search-query.repository.js';
import type { SearchQueryIdGenerator } from '@application/ports/search-query-id-generator.js';
import { PortError } from '@application/errors/port.error.js';
import { ok, type Result } from '@shared/result.js';
import { QueryTooAmbiguousError } from '@application/errors/query-too-ambiguous.error.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { fixedNow } from '@tests/shared/fixed-now.js';

class QueryInvoicesRagUseCaseStub {
    private readonly answer: string;

    constructor(answer: string) {
        this.answer = answer;
    }

    async execute(): Promise<Result<{ answer: string; references: Array<{ documentId: string; snippets: string[] }> }, PortError>> {
        return ok({
            answer: this.answer,
            references: [{ documentId: 'invoice-1', snippets: ['snippet'] }],
        });
    }
}

class SearchQueryRepositoryStub implements SearchQueryRepository {
    private readonly byKey = new Map<string, SearchQueryRecord>();
    private readonly byId = new Map<string, SearchQueryRecord>();

    async findByKey(key: string): Promise<Result<SearchQueryRecord | null, PortError>> {
        return ok(this.byKey.get(key) ?? null);
    }

    async findById(queryId: string): Promise<Result<SearchQueryRecord | null, PortError>> {
        return ok(this.byId.get(queryId) ?? null);
    }

    async save(record: SearchQueryRecord): Promise<Result<void, PortError>> {
        this.byKey.set(record.key, record);
        this.byId.set(record.queryId, record);
        return ok(undefined);
    }

    async clearAll(): Promise<Result<void, PortError>> {
        this.byKey.clear();
        this.byId.clear();
        return ok(undefined);
    }
}

class SearchQueryIdGeneratorStub implements SearchQueryIdGenerator {
    constructor(private readonly id: string) {}

    generate(): string {
        return this.id;
    }
}

type SutOverrides = Partial<{
    repository: SearchQueryRepository;
    queryId: string;
    answer: string;
    now: Date;
}>;

const makeSut = (overrides: SutOverrides = {}) => {
    const now = overrides.now ?? fixedNow;
    const repository = overrides.repository ?? new SearchQueryRepositoryStub();
    const useCase = new ProcessSearchQueryUseCase({
        queryInvoicesRagUseCase: new QueryInvoicesRagUseCaseStub(overrides.answer ?? 'respuesta'),
        searchQueryRepository: repository,
        searchQueryIdGenerator: new SearchQueryIdGeneratorStub(overrides.queryId ?? 'query-9'),
        dateProvider: new DateProviderStub(now),
    });

    return { useCase, repository };
};

const cachedQueryInput = {
    userId: 'user-1',
    query: '  TOTAL   FACTURA  ',
};

const defaultQueryInput = {
    userId: 'user-1',
    query: 'total factura',
};

const ambiguousQueryInput = {
    userId: 'user-1',
    query: 'facturas de marzo',
};

describe('ProcessSearchQueryUseCase', () => {
    it('returns cached result for repeated query', async () => {
        const repository = new SearchQueryRepositoryStub();
        const cachedRecord: SearchQueryRecord = {
            queryId: 'query-1',
            userId: 'user-1',
            originalQuery: 'total factura',
            normalizedQuery: 'total factura',
            key: 'user-1:total factura',
            answer: 'respuesta-cache',
            references: [],
            createdAt: fixedNow,
        };
        await repository.save(cachedRecord);

        const { useCase } = makeSut({ repository, queryId: 'query-2' });

        const result = await useCase.execute(cachedQueryInput);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.queryId).toBe('query-1');
            expect(result.value.answer).toBe('respuesta-cache');
        }
    });

    it('stores a new result when query is new', async () => {
        const { useCase } = makeSut();

        const result = await useCase.execute(defaultQueryInput);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.queryId).toBe('query-9');
            expect(result.value.answer).toBe('respuesta');
        }
    });

    it('returns error when query is ambiguous', async () => {
        const { useCase } = makeSut();

        const result = await useCase.execute(ambiguousQueryInput);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(QueryTooAmbiguousError);
        }
    });
});
