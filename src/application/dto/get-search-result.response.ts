import type { SearchReference } from '../ports/search-query.repository.js';

export type GetSearchResultResponse = {
    answer: string;
    references: SearchReference[];
};
