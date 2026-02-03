import { describe, expect, it } from 'vitest';
import { GetUserDetailUseCase } from '../../../src/application/use-cases/get-user-detail.use-case.js';
import type { UserRepository } from '../../../src/application/ports/user.repository.js';
import { User, UserStatus } from '../../../src/domain/entities/user.entity.js';
import type { UserProps } from '../../../src/domain/entities/user.entity.js';
import { UserRole } from '../../../src/domain/value-objects/user-role.value-object.js';
import { Email } from '../../../src/domain/value-objects/email.value-object.js';
import { UserNotFoundError } from '../../../src/domain/errors/user-not-found.error.js';
import { ok } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-02-03T12:00:00.000Z');

const createUser = (overrides: Partial<UserProps> = {}): User =>
    User.create({
        id: 'user-1',
        email: Email.create('user@example.com'),
        passwordHash: 'hash',
        name: 'Test User',
        avatar: 'avatar.png',
        status: UserStatus.Active,
        roles: [UserRole.user()],
        createdAt: fixedNow,
        updatedAt: fixedNow,
        deletedAt: undefined,
        ...overrides,
    });

class UserRepositoryStub implements UserRepository {
    constructor(private readonly user: User | null) {}

    async findByEmail() {
        return ok(null);
    }

    async findById() {
        return ok(this.user);
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

describe('GetUserDetailUseCase', () => {
    it('returns user detail when user exists', async () => {
        const user = createUser();
        const userRepository = new UserRepositoryStub(user);
        const useCase = new GetUserDetailUseCase({ userRepository });

        const result = await useCase.execute({ userId: 'user-1' });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.userId).toBe('user-1');
            expect(result.value.email).toBe('user@example.com');
            expect(result.value.name).toBe('Test User');
            expect(result.value.avatar).toBe('avatar.png');
            expect(result.value.status).toBe(UserStatus.Active);
            expect(result.value.roles[0]?.getValue()).toBe('USER');
            expect(result.value.createdAt).toBe(fixedNow);
            expect(result.value.updatedAt).toBe(fixedNow);
            expect(result.value.deletedAt).toBeUndefined();
            expect('passwordHash' in (result.value as Record<string, unknown>)).toBe(false);
        }
    });

    it('returns not found when user does not exist', async () => {
        const userRepository = new UserRepositoryStub(null);
        const useCase = new GetUserDetailUseCase({ userRepository });

        const result = await useCase.execute({ userId: 'missing-user' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(UserNotFoundError);
        }
    });
});
