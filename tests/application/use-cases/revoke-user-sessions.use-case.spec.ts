import { describe, expect, it } from 'vitest';
import { RevokeUserSessionsUseCase } from '../../../src/application/use-cases/revoke-user-sessions.use-case.js';
import type { UserRepository } from '../../../src/application/ports/user.repository.js';
import type { SessionRepository } from '../../../src/application/ports/session.repository.js';
import { User, UserStatus } from '../../../src/domain/entities/user.entity.js';
import type { UserProps } from '../../../src/domain/entities/user.entity.js';
import { UserRole } from '../../../src/domain/value-objects/user-role.value-object.js';
import { Email } from '../../../src/domain/value-objects/email.value-object.js';
import { UserNotFoundError } from '../../../src/domain/errors/user-not-found.error.js';
import { ok } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-02-03T17:00:00.000Z');

const testCredentialHashValue = 'hash';

const createUser = (overrides: Partial<UserProps> = {}): User =>
    User.create({
        id: 'user-1',
        email: Email.create('user@example.com'),
        passwordHash: testCredentialHashValue,
        status: UserStatus.Active,
        roles: [UserRole.user()],
        createdAt: fixedNow,
        updatedAt: fixedNow,
        deletedAt: undefined,
        ...overrides,
    });

class UserRepositorySpy implements UserRepository {
    private readonly storedUser: User | null;

    constructor(storedUser: User | null) {
        this.storedUser = storedUser;
    }

    async findByEmail() {
        return ok(null);
    }

    async findById() {
        return ok(this.storedUser);
    }

    async create() {
        return ok(undefined);
    }

    async list() {
        return ok({ items: [], total: 0 });
    }

    async update() {
        return ok(undefined);
    }
}

class SessionRepositorySpy implements SessionRepository {
    revokedForUserId: string | null = null;

    async create() {
        return ok(undefined);
    }

    async findByRefreshTokenHash() {
        return ok(null);
    }

    async update() {
        return ok(undefined);
    }

    async revokeByUserId(userId: string) {
        this.revokedForUserId = userId;
        return ok(undefined);
    }
}

describe('RevokeUserSessionsUseCase', () => {
    it('revokes sessions for existing user', async () => {
        const userRepository = new UserRepositorySpy(createUser());
        const sessionRepository = new SessionRepositorySpy();
        const useCase = new RevokeUserSessionsUseCase({ userRepository, sessionRepository });

        const result = await useCase.execute({ userId: 'user-1' });

        expect(result.success).toBe(true);
        expect(sessionRepository.revokedForUserId).toBe('user-1');
    });

    it('returns not found when user does not exist', async () => {
        const userRepository = new UserRepositorySpy(null);
        const sessionRepository = new SessionRepositorySpy();
        const useCase = new RevokeUserSessionsUseCase({ userRepository, sessionRepository });

        const result = await useCase.execute({ userId: 'missing-user' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(UserNotFoundError);
        }
    });
});
