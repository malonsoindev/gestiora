import type { Sql } from 'postgres';
import { ok, fail, type Result } from '../../../shared/result.js';
import { PortError } from '../../../application/errors/port.error.js';
import type { SearchQueryRecord, SearchQueryRepository, SearchReference } from '../../../application/ports/search-query.repository.js';
import { toDate } from '../../../shared/date-utils.js';

type SqlClient = Sql<{}>;

type SearchQueryRow = {
    query_id: string;
    user_id: string;
    original_query: string;
    normalized_query: string;
    query_key: string;
    answer: string;
    references_json: unknown;
    created_at: Date | string;
};

export class PostgresSearchQueryRepository implements SearchQueryRepository {
    constructor(private readonly sql: SqlClient) {}

    async findByKey(key: string): Promise<Result<SearchQueryRecord | null, PortError>> {
        try {
            const rows = await this.sql<SearchQueryRow[]>`
                select *
                from search_queries
                where query_key = ${key}
                limit 1
            `;
            const row = rows[0];
            return ok(row ? this.mapRow(row) : null);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('SearchQueryRepository', 'Failed to find search query by key', cause));
        }
    }

    async findById(queryId: string): Promise<Result<SearchQueryRecord | null, PortError>> {
        try {
            const rows = await this.sql<SearchQueryRow[]>`
                select *
                from search_queries
                where query_id = ${queryId}
                limit 1
            `;
            const row = rows[0];
            return ok(row ? this.mapRow(row) : null);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('SearchQueryRepository', 'Failed to find search query by id', cause));
        }
    }

    async save(record: SearchQueryRecord): Promise<Result<void, PortError>> {
        try {
            await this.sql`
                insert into search_queries (
                    query_id,
                    user_id,
                    original_query,
                    normalized_query,
                    query_key,
                    answer,
                    references_json,
                    created_at
                ) values (
                    ${record.queryId},
                    ${record.userId},
                    ${record.originalQuery},
                    ${record.normalizedQuery},
                    ${record.key},
                    ${record.answer},
                    ${this.sql.json(record.references)},
                    ${record.createdAt}
                )
            `;
            return ok(undefined);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('SearchQueryRepository', 'Failed to save search query', cause));
        }
    }

    private mapRow(row: SearchQueryRow): SearchQueryRecord {
        return {
            queryId: row.query_id,
            userId: row.user_id,
            originalQuery: row.original_query,
            normalizedQuery: row.normalized_query,
            key: row.query_key,
            answer: row.answer,
            references: this.toReferences(row.references_json),
            createdAt: toDate(row.created_at),
        };
    }

    private toReferences(value: unknown): SearchReference[] {
        if (!Array.isArray(value)) {
            return [];
        }
        return value.filter((item): item is SearchReference => {
            if (!item || typeof item !== 'object') {
                return false;
            }
            const candidate = item as SearchReference;
            return typeof candidate.documentId === 'string' && Array.isArray(candidate.snippets);
        });
    }
}
