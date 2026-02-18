import { describe, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres/postgres-user.repository.js';
import { createPostgresTestContext } from '@tests/shared/helpers/postgres-test-context.js';
import { userRepositoryContract } from '@tests/infrastructure/persistence/contracts/user-repository.contract.js';

const describeIf = process.env.DATABASE_URL ? describe : describe.skip;

// Use unique prefix to avoid conflicts with other integration tests and seed data
const TEST_PREFIX = 'user-repo-test';

describeIf('PostgresUserRepository', () => {
    const ctx = createPostgresTestContext();
    let repository: PostgresUserRepository;

    beforeAll(async () => {
        await ctx.setup();

        await ctx.sql`
            create table if not exists users (
                id text primary key,
                email text unique not null,
                password_hash text not null,
                name text null,
                avatar text null,
                status text not null,
                locked_until timestamptz null,
                roles text[] not null,
                created_at timestamptz not null,
                updated_at timestamptz not null,
                deleted_at timestamptz null
            )
        `;

        repository = new PostgresUserRepository(ctx.sql);
    });

    beforeEach(async () => {
        await ctx.beginTransaction();

        // Clean up within the transaction
        await ctx.sql`delete from sessions`;
        await ctx.sql`delete from users`;
    });

    afterEach(async () => {
        await ctx.rollbackTransaction();
    });

    afterAll(async () => {
        await ctx.cleanup();
    });

    // Run all contract tests
    userRepositoryContract({
        getRepository: () => repository,
        testPrefix: TEST_PREFIX,
    });
});
