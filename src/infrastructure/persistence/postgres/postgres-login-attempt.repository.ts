import type { Sql } from 'postgres';
import { fail, ok, type Result } from '@shared/result.js';
import { PortError } from '@application/errors/port.error.js';
import type { LoginAttemptKey, LoginAttemptRepository } from '@application/ports/login-attempt.repository.js';

type SqlClient = Sql<{}>;

export class PostgresLoginAttemptRepository implements LoginAttemptRepository {
    constructor(private readonly sql: SqlClient) {}

    async countFailedAttempts(
        key: LoginAttemptKey,
        windowMinutes: number,
    ): Promise<Result<number, PortError>> {
        try {
            const windowStart = new Date(Date.now() - windowMinutes * 60_000);
            const rows = key.ip
                ? await this.sql`
                    select count(*)::int as count
                    from login_attempts
                    where email = ${key.email}
                      and succeeded = false
                      and created_at >= ${windowStart}
                      and ip = ${key.ip}
                `
                : await this.sql`
                    select count(*)::int as count
                    from login_attempts
                    where email = ${key.email}
                      and succeeded = false
                      and created_at >= ${windowStart}
                `;

            const countValue = rows[0]?.count;
            const count = typeof countValue === 'number' ? countValue : Number(countValue ?? 0);
            return ok(count);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('LoginAttemptRepository', 'Failed to count login attempts', cause));
        }
    }

    async recordAttempt(
        key: LoginAttemptKey,
        succeeded: boolean,
        timestamp: Date,
    ): Promise<Result<void, PortError>> {
        try {
            await this.sql`
                insert into login_attempts (email, ip, succeeded, created_at)
                values (${key.email}, ${key.ip ?? null}, ${succeeded}, ${timestamp})
            `;
            return ok(undefined);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('LoginAttemptRepository', 'Failed to record login attempt', cause));
        }
    }
}
