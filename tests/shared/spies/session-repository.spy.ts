import type { SessionRepository } from '../../../src/application/ports/session.repository.js';
import type { Session } from '../../../src/domain/entities/session.entity.js';
import { ok } from '../../../src/shared/result.js';

export class SessionRepositorySpy implements SessionRepository {
    revokedForUserId: string | null = null;

    async create(_session: Session) {
        return ok(undefined);
    }

    async findByRefreshTokenHash(_hash: string) {
        return ok(null);
    }

    async update(_session: Session) {
        return ok(undefined);
    }

    async revokeByUserId(userId: string) {
        this.revokedForUserId = userId;
        return ok(undefined);
    }
}
