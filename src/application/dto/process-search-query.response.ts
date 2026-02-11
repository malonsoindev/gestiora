import type { SearchReference } from '../ports/search-query.repository.js';

export type ProcessSearchQueryResponse = {
    queryId: string;
    answer: string;
    references: SearchReference[];
};
