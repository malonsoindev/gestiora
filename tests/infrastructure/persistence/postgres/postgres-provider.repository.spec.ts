import { describe, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PostgresProviderRepository } from '@infrastructure/persistence/postgres/postgres-provider.repository.js';
import { createPostgresTestContext } from '@tests/shared/helpers/postgres-test-context.js';
import { providerRepositoryContract } from '@tests/infrastructure/persistence/contracts/provider-repository.contract.js';

const describeIf = process.env.DATABASE_URL ? describe : describe.skip;
const TEST_PREFIX = 'pg-prov-test';

describeIf('PostgresProviderRepository', () => {
    const ctx = createPostgresTestContext();
    let repository: PostgresProviderRepository;

    beforeAll(async () => {
        await ctx.setup();

        await ctx.sql`
            create table if not exists providers (
                id text primary key,
                razon_social text not null,
                razon_social_normalized text not null,
                cif text null,
                direccion text null,
                poblacion text null,
                provincia text null,
                pais text null,
                status text not null,
                created_at timestamptz not null,
                updated_at timestamptz not null,
                deleted_at timestamptz null
            )
        `;

        repository = new PostgresProviderRepository(ctx.sql);
    });

    beforeEach(async () => {
        await ctx.beginTransaction();

        // Clean up within the transaction
        await ctx.sql`delete from invoice_movements`;
        await ctx.sql`delete from invoices`;
        await ctx.sql`delete from providers`;
    });

    afterEach(async () => {
        await ctx.rollbackTransaction();
    });

    afterAll(async () => {
        await ctx.cleanup();
    });

    // Run contract tests
    providerRepositoryContract({
        getRepository: () => repository,
        testPrefix: TEST_PREFIX,
    });
});
