import type { SearchQueryRepository } from '@application/ports/search-query.repository.js';
import type { PortError } from '@application/errors/port.error.js';
import { SearchQueryNotFoundError } from '@domain/errors/search-query-not-found.error.js';
import { ok, fail, type Result } from '@shared/result.js';
import type { GetSearchResultRequest } from '@application/dto/get-search-result.request.js';
import type { GetSearchResultResponse } from '@application/dto/get-search-result.response.js';

export type GetSearchResultDependencies = {
    searchQueryRepository: SearchQueryRepository;
};

export type GetSearchResultError = SearchQueryNotFoundError | PortError;

export class GetSearchResultUseCase {
    constructor(private readonly dependencies: GetSearchResultDependencies) {}

    async execute(request: GetSearchResultRequest): Promise<Result<GetSearchResultResponse, GetSearchResultError>> {
        const recordResult = await this.dependencies.searchQueryRepository.findById(request.queryId);
        if (!recordResult.success) {
            return fail(recordResult.error);
        }

        const record = recordResult.value;
        if (!record) {
            return fail(new SearchQueryNotFoundError());
        }

        return ok({
            answer: record.answer,
            references: record.references,
        });
    }
}
