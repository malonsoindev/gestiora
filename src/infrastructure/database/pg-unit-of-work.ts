import type { Sql } from 'postgres';

type SqlClient = Sql<{}>;

export class PgUnitOfWork {
    constructor(private readonly sql: SqlClient) {}

    async withTransaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T> {
        const result = await this.sql.begin(async (tx) => fn(tx as unknown as SqlClient));
        return result as T;
    }
}
