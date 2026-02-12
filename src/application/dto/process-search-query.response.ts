import type { SearchReference } from '@application/ports/search-query.repository.js';

export type ProcessSearchQueryResponse = {
    queryId: string;
    answer: string;
    references: SearchReference[];
};
