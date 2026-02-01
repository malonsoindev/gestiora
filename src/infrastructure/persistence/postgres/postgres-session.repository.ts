import type { Sql } from 'postgres';
import { fail, ok, type Result } from '../../../shared/result.js';
import { toDate } from '../../../shared/date-utils.js';
import { toText } from '../../../shared/text-utils.js';
import { PortError } from '../../../application/errors/port.error.js';
import type { SessionRepository } from '../../../application/ports/session.repository.js';
import { Session, SessionStatus } from '../../../domain/entities/session.entity.js';

type SqlClient = Sql<{}>;

export class PostgresSessionRepository implements SessionRepository {
    constructor(private readonly sql: SqlClient) {}

    async create(session: Session): Promise<Result<void, PortError>> {
        try {
            await this.sql`
                insert into sessions (
                    id, user_id, refresh_token_hash, status, created_at, last_used_at, expires_at,
                    revoked_at, revoked_by, ip, user_agent
                ) values (
                    ${session.id},
                    ${session.userId},
                    ${session.refreshTokenHash},
                    ${session.status},
                    ${session.createdAt},
                    ${session.lastUsedAt},
                    ${session.expiresAt},
                    ${session.revokedAt ?? null},
                    ${session.revokedBy ?? null},
                    ${session.ip ?? null},
                    ${session.userAgent ?? null}
                )
            `;
            return ok(undefined);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('SessionRepository', 'Failed to create session', cause));
        }
    }

    async findByRefreshTokenHash(hash: string): Promise<Result<Session | null, PortError>> {
        try {
            const rows = await this.sql`
                select id, user_id, refresh_token_hash, status, created_at, last_used_at, expires_at,
                       revoked_at, revoked_by, ip, user_agent
                from sessions
                where refresh_token_hash = ${hash}
                limit 1
            `;

            const row = rows[0];
            if (!row) {
                return ok(null);
            }

            return ok(this.mapRowToSession(row));
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('SessionRepository', 'Failed to fetch session by refresh hash', cause));
        }
    }

    async update(session: Session): Promise<Result<void, PortError>> {
        try {
            await this.sql`
                update sessions
                set refresh_token_hash = ${session.refreshTokenHash},
                    status = ${session.status},
                    last_used_at = ${session.lastUsedAt},
                    expires_at = ${session.expiresAt},
                    revoked_at = ${session.revokedAt ?? null},
                    revoked_by = ${session.revokedBy ?? null},
                    ip = ${session.ip ?? null},
                    user_agent = ${session.userAgent ?? null}
                where id = ${session.id}
            `;
            return ok(undefined);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('SessionRepository', 'Failed to update session', cause));
        }
    }

    private mapRowToSession(row: Record<string, unknown>): Session {
        const statusValue = String(row.status);
        const status = this.mapStatus(statusValue);
        return Session.create({
            id: String(row.id),
            userId: String(row.user_id),
            refreshTokenHash: String(row.refresh_token_hash),
            status,
            createdAt: toDate(row.created_at),
            lastUsedAt: toDate(row.last_used_at),
            expiresAt: toDate(row.expires_at),
            ...(row.revoked_at ? { revokedAt: toDate(row.revoked_at) } : {}),
            ...(row.revoked_by ? { revokedBy: toText(row.revoked_by) } : {}),
            ...(row.ip ? { ip: toText(row.ip) } : {}),
            ...(row.user_agent ? { userAgent: toText(row.user_agent) } : {}),
        });
    }

    private mapStatus(value: string): SessionStatus {
        switch (value) {
            case SessionStatus.Active:
                return SessionStatus.Active;
            case SessionStatus.Revoked:
                return SessionStatus.Revoked;
            case SessionStatus.Expired:
                return SessionStatus.Expired;
            default:
                return SessionStatus.Expired;
        }
    }
}
