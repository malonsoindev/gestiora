import postgres from 'postgres';
import type { Sql } from 'postgres';

type SqlClient = Sql<{}>;

export type PostgresTestContext = {
    /** The SQL client to use in tests */
    sql: SqlClient;
    /** Setup function - call in beforeAll */
    setup: () => Promise<void>;
    /** Cleanup function - call in afterAll */
    cleanup: () => Promise<void>;
    /** Begin transaction - call in beforeEach */
    beginTransaction: () => Promise<void>;
    /** Rollback transaction - call in afterEach */
    rollbackTransaction: () => Promise<void>;
};

/**
 * Creates a Postgres test context that provides transaction isolation.
 * 
 * Each test runs within a transaction that is rolled back after the test,
 * ensuring no permanent changes are made to the database.
 * 
 * @example
 * ```typescript
 * const ctx = createPostgresTestContext();
 * 
 * describeIf('PostgresUserRepository', () => {
 *     beforeAll(() => ctx.setup());
 *     afterAll(() => ctx.cleanup());
 *     beforeEach(() => ctx.beginTransaction());
 *     afterEach(() => ctx.rollbackTransaction());
 * 
 *     it('creates a user', async () => {
 *         const repository = new PostgresUserRepository(ctx.sql);
 *         // ... test code
 *     });
 * });
 * ```
 */
export function createPostgresTestContext(): PostgresTestContext {
    const databaseUrl = process.env.DATABASE_URL;
    
    // Create a connection with a single reserved connection for transaction control
    const sql: SqlClient = databaseUrl 
        ? postgres(databaseUrl, { max: 1 })
        : (undefined as unknown as SqlClient);

    return {
        sql,
        
        setup: async () => {
            // Start a transaction that will span all tests
            await sql.unsafe('BEGIN');
        },
        
        cleanup: async () => {
            // Rollback any remaining transaction and close connection
            try {
                await sql.unsafe('ROLLBACK');
            } catch {
                // Ignore errors if no transaction is active
            }
            await sql.end({ timeout: 5 });
        },
        
        beginTransaction: async () => {
            // Create a savepoint at the start of each test
            await sql.unsafe('SAVEPOINT test_savepoint');
        },
        
        rollbackTransaction: async () => {
            // Rollback to the savepoint, undoing all changes from the test
            await sql.unsafe('ROLLBACK TO SAVEPOINT test_savepoint');
        },
    };
}
