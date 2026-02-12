import postgres from 'postgres';
import { config } from '@composition/config.js';
import { PgUnitOfWork } from '@infrastructure/database/pg-unit-of-work.js';

type SqlClient = ReturnType<typeof postgres>;

/**
 * DatabaseFactory uses a singleton to keep a single shared database client.
 * This avoids creating multiple pools/connections and centralizes lifecycle management.
 */
export class DatabaseFactory {
    private static client: SqlClient | null = null;

    /**
     * Lazily create and return the shared client instance.
     * 
     * @returns SqlClient
     */
    static createClient(): SqlClient {
        if (DatabaseFactory.client) {
            return DatabaseFactory.client;
        }

        if (!config.DATABASE_URL) {
            throw new Error('DATABASE_URL is not configured');
        }

        DatabaseFactory.client = postgres(config.DATABASE_URL);
        return DatabaseFactory.client;
    }

    /**
     * Close the shared client and reset the singleton.
     *
     * @returns Promise<void>
     */
    static async closeClient(): Promise<void> {
        if (!DatabaseFactory.client) {
            return;
        }

        await DatabaseFactory.client.end();
        DatabaseFactory.client = null;
    }

    /**
     * Build a unit of work bound to the shared client.
     *
     * @returns PgUnitOfWork
     */
    static createUnitOfWork(): PgUnitOfWork {
        const client = DatabaseFactory.createClient();
        return new PgUnitOfWork(client);
    }

    /**
     * Executes a lightweight query to verify connectivity.
     *
     * @returns Promise<boolean>
     */
    static async checkConnection(): Promise<boolean> {
        try {
            const client = DatabaseFactory.createClient();
            await client`select 1`;
            return true;
        } catch {
            return false;
        }
    }
}
