import { ok, type Result } from '../../../shared/result.js';
import { PortError } from '../../../application/errors/port.error.js';
import type { SearchQueryRepository, SearchQueryRecord } from '../../../application/ports/search-query.repository.js';

export class InMemorySearchQueryRepository implements SearchQueryRepository {
    private readonly queriesById = new Map<string, SearchQueryRecord>();
    private readonly queriesByKey = new Map<string, SearchQueryRecord>();

    async findByKey(key: string): Promise<Result<SearchQueryRecord | null, PortError>> {
        return ok(this.queriesByKey.get(key) ?? null);
    }

    async findById(queryId: string): Promise<Result<SearchQueryRecord | null, PortError>> {
        return ok(this.queriesById.get(queryId) ?? null);
    }

    async save(record: SearchQueryRecord): Promise<Result<void, PortError>> {
        this.queriesById.set(record.queryId, record);
        this.queriesByKey.set(record.key, record);
        return ok(undefined);
    }

    async clearAll(): Promise<Result<void, PortError>> {
        this.queriesById.clear();
        this.queriesByKey.clear();
        return ok(undefined);
    }
}
