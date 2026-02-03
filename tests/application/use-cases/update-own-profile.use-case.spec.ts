import { describe, expect, it } from 'vitest';
import { UpdateOwnProfileUseCase } from '../../../src/application/use-cases/update-own-profile.use-case.js';
import type { UserRepository } from '../../../src/application/ports/user.repository.js';
import { User, UserStatus } from '../../../src/domain/entities/user.entity.js';
import type { UserProps } from '../../../src/domain/entities/user.entity.js';
import { UserRole } from '../../../src/domain/value-objects/user-role.value-object.js';
import { Email } from '../../../src/domain/value-objects/email.value-object.js';
import { UserNotFoundError } from '../../../src/domain/errors/user-not-found.error.js';
import { ok } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-02-03T16:00:00.000Z');

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

describe('UpdateOwnProfileUseCase', () => {
    it('updates name and avatar for current user', async () => {
        const user = createUser({ id: 'user-1' });
        const userRepository = new UserRepositorySpy(user);
        const useCase = new UpdateOwnProfileUseCase({ userRepository, now: () => fixedNow });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            name: 'Updated',
            avatar: 'updated.png',
        });

        expect(result.success).toBe(true);
        expect(userRepository.updatedUser?.name).toBe('Updated');
        expect(userRepository.updatedUser?.avatar).toBe('updated.png');
        expect(userRepository.updatedUser?.updatedAt).toBe(fixedNow);
    });

    it('returns not found when user does not exist', async () => {
        const userRepository = new UserRepositorySpy(null);
        const useCase = new UpdateOwnProfileUseCase({ userRepository, now: () => fixedNow });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            name: 'Updated',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(UserNotFoundError);
        }
    });
});
