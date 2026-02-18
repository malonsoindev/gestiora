import { describe, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PostgresLoginAttemptRepository } from '@infrastructure/persistence/postgres/postgres-login-attempt.repository.js';
import { createPostgresTestContext } from '@tests/shared/helpers/postgres-test-context.js';
import { loginAttemptRepositoryContract } from '@tests/infrastructure/persistence/contracts/login-attempt-repository.contract.js';

const describeIf = process.env.DATABASE_URL ? describe : describe.skip;

// Use unique prefix to avoid conflicts with other integration tests
const TEST_PREFIX = 'login-attempt-test';

describeIf('PostgresLoginAttemptRepository', () => {
    const ctx = createPostgresTestContext();
    let repository: PostgresLoginAttemptRepository;

    beforeAll(async () => {
        await ctx.setup();

        await ctx.sql`
            create table if not exists login_attempts (
                id bigserial primary key,
                email text not null,
                ip text null,
                succeeded boolean not null,
                created_at timestamptz not null
            )
        `;

        repository = new PostgresLoginAttemptRepository(ctx.sql);
    });

    beforeEach(async () => {
        await ctx.beginTransaction();

        // Clean up within the transaction
        await ctx.sql`delete from login_attempts`;
    });

    afterEach(async () => {
        await ctx.rollbackTransaction();
    });

    afterAll(async () => {
        await ctx.cleanup();
    });

    // Run all contract tests
    loginAttemptRepositoryContract({
        getRepository: () => repository,
        testPrefix: TEST_PREFIX,
    });
});
