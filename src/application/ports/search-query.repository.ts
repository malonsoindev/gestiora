import type { Result } from '../../shared/result.js';
import type { PortError } from '../errors/port.error.js';

export type SearchReference = {
    documentId: string;
    snippets: string[];
};

export type SearchQueryRecord = {
    queryId: string;
    userId: string;
    originalQuery: string;
    normalizedQuery: string;
    key: string;
    answer: string;
    references: SearchReference[];
    createdAt: Date;
};

export interface SearchQueryRepository {
    findByKey(key: string): Promise<Result<SearchQueryRecord | null, PortError>>;
    findById(queryId: string): Promise<Result<SearchQueryRecord | null, PortError>>;
    save(record: SearchQueryRecord): Promise<Result<void, PortError>>;
}
