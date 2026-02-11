import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import { PostgresSearchQueryRepository } from '../../../../src/infrastructure/persistence/postgres/postgres-search-query.repository.js';

const describeIf = process.env.DATABASE_URL ? describe : describe.skip;
const fixedNow = new Date('2026-03-15T10:00:00.000Z');

describeIf('PostgresSearchQueryRepository', () => {
    const sql = postgres(process.env.DATABASE_URL as string, { max: 1 });
    const repository = new PostgresSearchQueryRepository(sql);

    beforeAll(async () => {
        await sql`
            create table if not exists search_queries (
                query_id text primary key,
                user_id text not null,
                original_query text not null,
                normalized_query text not null,
                query_key text not null,
                answer text not null,
                references jsonb not null,
                created_at timestamptz not null
            )
        `;
    });

    beforeEach(async () => {
        await sql`delete from search_queries where query_id in ('query-1', 'query-2')`;
    });

    afterAll(async () => {
        await sql.end();
    });

    it('saves and retrieves by key', async () => {
        const record = {
            queryId: 'query-1',
            userId: 'user-1',
            originalQuery: 'Total factura',
            normalizedQuery: 'total factura',
            key: 'user-1:total factura',
            answer: 'respuesta',
            references: [{ documentId: 'invoice-1', snippets: ['snippet'] }],
            createdAt: fixedNow,
        };

        const saveResult = await repository.save(record);
        expect(saveResult.success).toBe(true);

        const fetchResult = await repository.findByKey(record.key);
        expect(fetchResult.success).toBe(true);
        if (fetchResult.success) {
            expect(fetchResult.value?.queryId).toBe(record.queryId);
            expect(fetchResult.value?.references[0]?.documentId).toBe('invoice-1');
        }
    });

    it('retrieves by id', async () => {
        const record = {
            queryId: 'query-2',
            userId: 'user-1',
            originalQuery: 'IVA factura',
            normalizedQuery: 'iva factura',
            key: 'user-1:iva factura',
            answer: 'respuesta-2',
            references: [],
            createdAt: fixedNow,
        };

        await repository.save(record);

        const fetchResult = await repository.findById(record.queryId);
        expect(fetchResult.success).toBe(true);
        if (fetchResult.success) {
            expect(fetchResult.value?.answer).toBe('respuesta-2');
        }
    });
});
