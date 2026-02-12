import { describe, expect, it } from 'vitest';
import { SoftDeleteUserUseCase } from '../../../src/application/use-cases/soft-delete-user.use-case.js';
import type { UserRepository } from '../../../src/application/ports/user.repository.js';
import type { SessionRepository } from '../../../src/application/ports/session.repository.js';
import { User, UserStatus } from '../../../src/domain/entities/user.entity.js';
import type { UserProps } from '../../../src/domain/entities/user.entity.js';
import { UserRole } from '../../../src/domain/value-objects/user-role.value-object.js';
import { Email } from '../../../src/domain/value-objects/email.value-object.js';
import { UserNotFoundError } from '../../../src/domain/errors/user-not-found.error.js';
import { SelfDeletionNotAllowedError } from '../../../src/domain/errors/self-deletion-not-allowed.error.js';
import { ok } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-02-03T15:00:00.000Z');

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
    updatedUser: User | null = null;
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

    async update(user: User) {
        this.updatedUser = user;
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

describe('SoftDeleteUserUseCase', () => {
    it('marks user as deleted and revokes sessions', async () => {
        const user = createUser();
        const userRepository = new UserRepositorySpy(user);
        const sessionRepository = new SessionRepositorySpy();
        const useCase = new SoftDeleteUserUseCase({
            userRepository,
            sessionRepository,
            now: () => fixedNow,
        });

        const result = await useCase.execute({ userId: 'user-1', actorUserId: 'admin-1' });

        expect(result.success).toBe(true);
        expect(userRepository.updatedUser?.status).toBe(UserStatus.Deleted);
        expect(userRepository.updatedUser?.deletedAt).toBe(fixedNow);
        expect(userRepository.updatedUser?.updatedAt).toBe(fixedNow);
        expect(sessionRepository.revokedForUserId).toBe('user-1');
    });

    it('returns not found when user does not exist', async () => {
        const userRepository = new UserRepositorySpy(null);
        const sessionRepository = new SessionRepositorySpy();
        const useCase = new SoftDeleteUserUseCase({
            userRepository,
            sessionRepository,
            now: () => fixedNow,
        });

        const result = await useCase.execute({ userId: 'missing-user', actorUserId: 'admin-1' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(UserNotFoundError);
        }
    });

    it('rejects self deletion', async () => {
        const user = createUser({ id: 'admin-1', roles: [UserRole.admin()] });
        const userRepository = new UserRepositorySpy(user);
        const sessionRepository = new SessionRepositorySpy();
        const useCase = new SoftDeleteUserUseCase({
            userRepository,
            sessionRepository,
            now: () => fixedNow,
        });

        const result = await useCase.execute({ userId: 'admin-1', actorUserId: 'admin-1' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(SelfDeletionNotAllowedError);
        }
    });
});
