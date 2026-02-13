import type { IndexInvoicesForRagRequest } from '@application/dto/index-invoices-for-rag.request.js';
import type { IndexInvoicesForRagResponse } from '@application/dto/index-invoices-for-rag.response.js';
import type { Result } from '@shared/result.js';
import { ok, fail } from '@shared/result.js';

export const indexRagRows = async <E>(
    indexer: {
        execute(request: IndexInvoicesForRagRequest): Promise<Result<IndexInvoicesForRagResponse, E>>;
    },
    rows: IndexInvoicesForRagRequest['rows'],
): Promise<Result<void, E>> => {
    if (rows.length === 0) {
        return ok(undefined);
    }

    const indexResult = await indexer.execute({ rows });
    if (!indexResult.success) {
        return fail(indexResult.error);
    }

    return ok(undefined);
};

export const clearSearchQueries = async <E>(
    repository: { clearAll(): Promise<Result<void, E>> },
): Promise<Result<void, E>> => {
    const clearResult = await repository.clearAll();
    if (!clearResult.success) {
        return fail(clearResult.error);
    }

    return ok(undefined);
};
