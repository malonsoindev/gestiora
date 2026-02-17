import { describe, expect, it } from 'vitest';
import { GetSearchResultUseCase } from '@application/use-cases/get-search-result.use-case.js';
import type { SearchQueryRepository, SearchQueryRecord } from '@application/ports/search-query.repository.js';
import type { PortError } from '@application/errors/port.error.js';
import { SearchQueryNotFoundError } from '@domain/errors/search-query-not-found.error.js';
import { ok, type Result } from '@shared/result.js';

const fixedNow = new Date('2026-02-21T10:00:00.000Z');

class SearchQueryRepositoryStub implements SearchQueryRepository {
    private readonly record: SearchQueryRecord | null;

    constructor(record: SearchQueryRecord | null) {
        this.record = record;
    }

    async findByKey(): Promise<Result<SearchQueryRecord | null, PortError>> {
        return ok(this.record);
    }

    async findById(): Promise<Result<SearchQueryRecord | null, PortError>> {
        return ok(this.record);
    }

    async save(): Promise<Result<void, PortError>> {
        return ok(undefined);
    }

    async clearAll(): Promise<Result<void, PortError>> {
        return ok(undefined);
    }
}

describe('GetSearchResultUseCase', () => {
    it('returns stored result', async () => {
        const repository = new SearchQueryRepositoryStub({
            queryId: 'query-1',
            userId: 'user-1',
            originalQuery: 'total',
            normalizedQuery: 'total',
            key: 'user-1:total',
            answer: 'respuesta',
            references: [],
            createdAt: fixedNow,
        });
        const useCase = new GetSearchResultUseCase({ searchQueryRepository: repository });

        const result = await useCase.execute({ queryId: 'query-1' });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.answer).toBe('respuesta');
        }
    });

    it('returns not found error when missing', async () => {
        const repository = new SearchQueryRepositoryStub(null);
        const useCase = new GetSearchResultUseCase({ searchQueryRepository: repository });

        const result = await useCase.execute({ queryId: 'query-1' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(SearchQueryNotFoundError);
        }
    });
});
