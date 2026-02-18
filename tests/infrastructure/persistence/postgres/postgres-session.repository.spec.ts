import { describe, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PostgresSessionRepository } from '@infrastructure/persistence/postgres/postgres-session.repository.js';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres/postgres-user.repository.js';
import { createPostgresTestContext } from '@tests/shared/helpers/postgres-test-context.js';
import { sessionRepositoryContract, type SessionRepositoryContractContext } from '@tests/infrastructure/persistence/contracts/session-repository.contract.js';
import { createTestUser } from '@tests/shared/builders/user.builder.js';
import { createSessionTestIds } from '@tests/shared/builders/session.builder.js';

const describeIf = process.env.DATABASE_URL ? describe : describe.skip;

// Use unique prefix to avoid conflicts with other integration tests
const TEST_PREFIX = 'session-repo-test';
const ids = createSessionTestIds(TEST_PREFIX);

describeIf('PostgresSessionRepository', () => {
    const ctx = createPostgresTestContext();
    let sessionRepository: PostgresSessionRepository;
    let userRepository: PostgresUserRepository;

    beforeAll(async () => {
        await ctx.setup();

        // Ensure users table exists (sessions depend on it via FK)
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

        await ctx.sql`
            create table if not exists sessions (
                id text primary key,
                user_id text not null references users(id),
                refresh_token_hash text unique not null,
                status text not null,
                created_at timestamptz not null,
                last_used_at timestamptz not null,
                expires_at timestamptz not null,
                revoked_at timestamptz null,
                revoked_by text null,
                ip text null,
                user_agent text null
            )
        `;

        sessionRepository = new PostgresSessionRepository(ctx.sql);
        userRepository = new PostgresUserRepository(ctx.sql);
    });

    beforeEach(async () => {
        await ctx.beginTransaction();

        // Clean up and seed test users within the transaction
        await ctx.sql`delete from sessions`;
        await ctx.sql`delete from users`;

        // Create test users for FK references
        const user1 = createTestUser({ id: ids.users.one, email: `${TEST_PREFIX}-1@example.com` });
        const user2 = createTestUser({ id: ids.users.two, email: `${TEST_PREFIX}-2@example.com` });
        await userRepository.create(user1);
        await userRepository.create(user2);
    });

    afterEach(async () => {
        await ctx.rollbackTransaction();
    });

    afterAll(async () => {
        await ctx.cleanup();
    });

    // Run all contract tests
    const contractContext: SessionRepositoryContractContext = {
        getRepository: () => sessionRepository,
        testPrefix: TEST_PREFIX,
    };
    sessionRepositoryContract(contractContext);
});
