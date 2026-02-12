import type { SearchReference } from '@application/ports/search-query.repository.js';

export type GetSearchResultResponse = {
    answer: string;
    references: SearchReference[];
};
