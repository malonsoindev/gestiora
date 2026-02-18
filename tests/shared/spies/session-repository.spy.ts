import type { SessionRepository } from '@application/ports/session.repository.js';
import type { Session } from '@domain/entities/session.entity.js';
import { ok } from '@shared/result.js';

/**
 * SessionRepositorySpy - Test spy for SessionRepository
 *
 * Tracks all operations and allows pre-configuring responses.
 *
 * @example
 * ```typescript
 * const spy = new SessionRepositorySpy();
 * spy.session = activeSession; // Pre-configure findByRefreshTokenHash to return this
 *
 * await useCase.execute(request);
 *
 * expect(spy.created).not.toBeNull(); // Verify create was called
 * expect(spy.updated?.status).toBe(SessionStatus.Revoked);
 * ```
 */
export class SessionRepositorySpy implements SessionRepository {
    /** Session returned by findByRefreshTokenHash. Set before test execution. */
    session: Session | null = null;

    /** Captures the session passed to create() */
    created: Session | null = null;

    /** Captures the session passed to update() */
    updated: Session | null = null;

    /** Captures the userId passed to revokeByUserId() */
    revokedForUserId: string | null = null;

    async create(session: Session) {
        this.created = session;
        return ok(undefined);
    }

    async findByRefreshTokenHash(_hash: string) {
        return ok(this.session);
    }

    async update(session: Session) {
        this.updated = session;
        return ok(undefined);
    }

    async revokeByUserId(userId: string) {
        this.revokedForUserId = userId;
        return ok(undefined);
    }
}
