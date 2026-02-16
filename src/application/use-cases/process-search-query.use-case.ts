import type { QueryInvoicesRagRequest } from '@application/dto/query-invoices-rag.request.js';
import type { QueryInvoicesRagResponse } from '@application/dto/query-invoices-rag.response.js';
import type { SearchQueryRepository } from '@application/ports/search-query.repository.js';
import type { SearchQueryIdGenerator } from '@application/ports/search-query-id-generator.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { PortError } from '@application/errors/port.error.js';
import { ok, fail, type Result } from '@shared/result.js';
import { normalizeText } from '@shared/text-utils.js';
import { SearchFilterDetector } from '@application/services/search-filter-detector.service.js';
import { SearchAmbiguityDetector } from '@application/services/search-ambiguity-detector.service.js';
import type { ProcessSearchQueryRequest } from '@application/dto/process-search-query.request.js';
import type { ProcessSearchQueryResponse } from '@application/dto/process-search-query.response.js';
import { QueryTooAmbiguousError } from '@application/errors/query-too-ambiguous.error.js';

export type ProcessSearchQueryDependencies = {
    queryInvoicesRagUseCase: {
        execute(request: QueryInvoicesRagRequest): Promise<Result<QueryInvoicesRagResponse, PortError>>;
    };
    searchQueryRepository: SearchQueryRepository;
    searchQueryIdGenerator: SearchQueryIdGenerator;
    dateProvider: DateProvider;
};

export type ProcessSearchQueryError = QueryTooAmbiguousError | PortError;

export class ProcessSearchQueryUseCase {
    private readonly filterDetector = new SearchFilterDetector();
    private readonly ambiguityDetector = new SearchAmbiguityDetector();

    constructor(private readonly dependencies: ProcessSearchQueryDependencies) {}

    async execute(request: ProcessSearchQueryRequest): Promise<Result<ProcessSearchQueryResponse, ProcessSearchQueryError>> {
        const normalizedQuery = normalizeText(request.query);
        const filters = this.filterDetector.detect(request.query);

        if (this.ambiguityDetector.isAmbiguous(normalizedQuery, filters)) {
            return fail(new QueryTooAmbiguousError());
        }

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

    private buildKey(userId: string, normalizedQuery: string): string {
        return `${userId}:${normalizedQuery}`;
    }
}
