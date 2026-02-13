import type { IndexInvoicesForRagRequest } from '@application/dto/index-invoices-for-rag.request.js';
import type { IndexInvoicesForRagResponse } from '@application/dto/index-invoices-for-rag.response.js';
import { ok, fail, type Result } from '@shared/result.js';

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

type RagPageResult<TItem> = {
    items: TItem[];
    total: number;
};

export const reindexRagPages = async <E, TItem>(
    params: {
        listPage: (page: number) => Promise<Result<RagPageResult<TItem>, E>>;
        buildRows: (items: TItem[]) => Promise<Result<IndexInvoicesForRagRequest['rows'], E>>;
        indexer: {
            execute(request: IndexInvoicesForRagRequest): Promise<Result<IndexInvoicesForRagResponse, E>>;
        };
        searchQueryRepository: { clearAll(): Promise<Result<void, E>> };
    },
): Promise<Result<void, E>> => {
    let page = 1;
    let processed = 0;
    let total = 0;

    while (true) {
        const listResult = await params.listPage(page);
        if (!listResult.success) {
            return fail(listResult.error);
        }

        if (page === 1) {
            total = listResult.value.total;
        }

        if (listResult.value.items.length === 0) {
            break;
        }

        const rowsResult = await params.buildRows(listResult.value.items);
        if (!rowsResult.success) {
            return fail(rowsResult.error);
        }

        const indexResult = await indexRagRows(params.indexer, rowsResult.value);
        if (!indexResult.success) {
            return fail(indexResult.error);
        }

        processed += listResult.value.items.length;
        if (processed >= total) {
            break;
        }
        page += 1;
    }

    return clearSearchQueries(params.searchQueryRepository);
};
