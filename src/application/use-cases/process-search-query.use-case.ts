import type { QueryInvoicesRagRequest } from '../dto/query-invoices-rag.request.js';
import type { QueryInvoicesRagResponse } from '../dto/query-invoices-rag.response.js';
import type { SearchQueryRepository } from '../ports/search-query.repository.js';
import type { SearchQueryIdGenerator } from '../ports/search-query-id-generator.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { PortError } from '../errors/port.error.js';
import { ok, fail, type Result } from '../../shared/result.js';
import { SearchFilterDetector } from '../services/search-filter-detector.service.js';
import type { ProcessSearchQueryRequest } from '../dto/process-search-query.request.js';
import type { ProcessSearchQueryResponse } from '../dto/process-search-query.response.js';

export type ProcessSearchQueryDependencies = {
    queryInvoicesRagUseCase: {
        execute(request: QueryInvoicesRagRequest): Promise<Result<QueryInvoicesRagResponse, PortError>>;
    };
    searchQueryRepository: SearchQueryRepository;
    searchQueryIdGenerator: SearchQueryIdGenerator;
    dateProvider: DateProvider;
};

export type ProcessSearchQueryError = PortError;

export class ProcessSearchQueryUseCase {
    private readonly filterDetector = new SearchFilterDetector();

    constructor(private readonly dependencies: ProcessSearchQueryDependencies) {}

    async execute(request: ProcessSearchQueryRequest): Promise<Result<ProcessSearchQueryResponse, ProcessSearchQueryError>> {
        const normalizedQuery = this.normalizeQuery(request.query);
        const key = this.buildKey(request.userId, normalizedQuery);

        const existingResult = await this.dependencies.searchQueryRepository.findByKey(key);
        if (!existingResult.success) {
            return fail(existingResult.error);
        }
        if (existingResult.value) {
            return ok({
                queryId: existingResult.value.queryId,
                answer: existingResult.value.answer,
                references: existingResult.value.references,
            });
        }

        const filters = this.filterDetector.detect(request.query);
        const queryResult = await this.dependencies.queryInvoicesRagUseCase.execute({
            query: request.query,
            filters,
        });
        if (!queryResult.success) {
            return fail(queryResult.error);
        }

        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }

        const record = {
            queryId: this.dependencies.searchQueryIdGenerator.generate(),
            userId: request.userId,
            originalQuery: request.query,
            normalizedQuery,
            key,
            answer: queryResult.value.answer,
            references: queryResult.value.references,
            createdAt: nowResult.value,
        };

        const saveResult = await this.dependencies.searchQueryRepository.save(record);
        if (!saveResult.success) {
            return fail(saveResult.error);
        }

        return ok({
            queryId: record.queryId,
            answer: record.answer,
            references: record.references,
        });
    }

    private normalizeQuery(query: string): string {
        return query.trim().replaceAll(/\s+/g, ' ').toLowerCase();
    }

    private buildKey(userId: string, normalizedQuery: string): string {
        return `${userId}:${normalizedQuery}`;
    }
}
