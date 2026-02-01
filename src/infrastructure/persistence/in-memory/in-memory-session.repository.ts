import { ok, type Result } from '../../../shared/result.js';
import { PortError } from '../../../application/errors/port.error.js';
import type { SessionRepository } from '../../../application/ports/session.repository.js';
import type { Session } from '../../../domain/entities/session.entity.js';

export class InMemorySessionRepository implements SessionRepository {
    private readonly sessionsById = new Map<string, Session>();
    private readonly sessionsByRefreshHash = new Map<string, Session>();

    async create(session: Session): Promise<Result<void, PortError>> {
        this.sessionsById.set(session.id, session);
        this.sessionsByRefreshHash.set(session.refreshTokenHash, session);
        return ok(undefined);
    }

    async findByRefreshTokenHash(
        hash: string,
    ): Promise<Result<Session | null, PortError>> {
        return ok(this.sessionsByRefreshHash.get(hash) ?? null);
    }

    async update(session: Session): Promise<Result<void, PortError>> {
        const existing = this.sessionsById.get(session.id);
        if (existing && existing.refreshTokenHash !== session.refreshTokenHash) {
            this.sessionsByRefreshHash.delete(existing.refreshTokenHash);
        }

        this.sessionsById.set(session.id, session);
        this.sessionsByRefreshHash.set(session.refreshTokenHash, session);
        return ok(undefined);
    }
}
