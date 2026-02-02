import postgres from 'postgres';
import { config } from '../../composition/config.js';
import { PgUnitOfWork } from './pg-unit-of-work.js';

type SqlClient = ReturnType<typeof postgres>;

export class DatabaseFactory {
    private static client: SqlClient | null = null;

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

    static async closeClient(): Promise<void> {
        if (!DatabaseFactory.client) {
            return;
        }

        await DatabaseFactory.client.end();
        DatabaseFactory.client = null;
    }

    static createUnitOfWork(): PgUnitOfWork {
        const client = DatabaseFactory.createClient();
        return new PgUnitOfWork(client);
    }
}
