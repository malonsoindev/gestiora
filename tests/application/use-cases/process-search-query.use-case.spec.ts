import { describe, expect, it } from 'vitest';
import { ProcessSearchQueryUseCase } from '../../../src/application/use-cases/process-search-query.use-case.js';
import type { SearchQueryRepository, SearchQueryRecord } from '../../../src/application/ports/search-query.repository.js';
import type { SearchQueryIdGenerator } from '../../../src/application/ports/search-query-id-generator.js';
import type { DateProvider } from '../../../src/application/ports/date-provider.js';
import { PortError } from '../../../src/application/errors/port.error.js';
import { ok, fail, type Result } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-02-20T10:00:00.000Z');

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
}

class SearchQueryIdGeneratorStub implements SearchQueryIdGenerator {
    constructor(private readonly id: string) {}

    generate(): string {
        return this.id;
    }
}

class DateProviderStub implements DateProvider {
    now(): Result<Date, PortError> {
        return ok(fixedNow);
    }
}

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

        const useCase = new ProcessSearchQueryUseCase({
            queryInvoicesRagUseCase: new QueryInvoicesRagUseCaseStub('respuesta'),
            searchQueryRepository: repository,
            searchQueryIdGenerator: new SearchQueryIdGeneratorStub('query-2'),
            dateProvider: new DateProviderStub(),
        });

        const result = await useCase.execute({
            userId: 'user-1',
            query: '  TOTAL   FACTURA  ',
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.queryId).toBe('query-1');
            expect(result.value.answer).toBe('respuesta-cache');
        }
    });

    it('stores a new result when query is new', async () => {
        const repository = new SearchQueryRepositoryStub();
        const useCase = new ProcessSearchQueryUseCase({
            queryInvoicesRagUseCase: new QueryInvoicesRagUseCaseStub('respuesta'),
            searchQueryRepository: repository,
            searchQueryIdGenerator: new SearchQueryIdGeneratorStub('query-9'),
            dateProvider: new DateProviderStub(),
        });

        const result = await useCase.execute({
            userId: 'user-1',
            query: 'total factura',
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.queryId).toBe('query-9');
            expect(result.value.answer).toBe('respuesta');
        }
    });
});
