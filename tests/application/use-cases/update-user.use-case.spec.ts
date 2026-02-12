import { describe, expect, it } from 'vitest';
import { UpdateUserUseCase } from '../../../src/application/use-cases/update-user.use-case.js';
import type { UserRepository } from '../../../src/application/ports/user.repository.js';
import { User, UserStatus } from '../../../src/domain/entities/user.entity.js';
import type { UserProps } from '../../../src/domain/entities/user.entity.js';
import { UserRole } from '../../../src/domain/value-objects/user-role.value-object.js';
import { Email } from '../../../src/domain/value-objects/email.value-object.js';
import { UserNotFoundError } from '../../../src/domain/errors/user-not-found.error.js';
import { InvalidUserRolesError } from '../../../src/domain/errors/invalid-user-roles.error.js';
import { InvalidUserStatusError } from '../../../src/domain/errors/invalid-user-status.error.js';
import { ok } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-02-03T13:00:00.000Z');

const testCredentialHashValue = 'hash';

const createUser = (overrides: Partial<UserProps> = {}): User =>
    User.create({
        id: 'user-1',
        email: Email.create('user@example.com'),
        passwordHash: testCredentialHashValue,
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

describe('UpdateUserUseCase', () => {
    it('updates name, avatar, roles and status', async () => {
        const user = createUser();
        const userRepository = new UserRepositorySpy(user);
        const useCase = new UpdateUserUseCase({ userRepository, now: () => fixedNow });

        const result = await useCase.execute({
            userId: 'user-1',
            name: 'Updated',
            avatar: 'updated.png',
            roles: [UserRole.admin()],
            status: UserStatus.Inactive,
        });

        expect(result.success).toBe(true);
        expect(userRepository.updatedUser?.name).toBe('Updated');
        expect(userRepository.updatedUser?.avatar).toBe('updated.png');
        expect(userRepository.updatedUser?.roles[0]?.getValue()).toBe('ADMIN');
        expect(userRepository.updatedUser?.status).toBe(UserStatus.Inactive);
        expect(userRepository.updatedUser?.updatedAt).toBe(fixedNow);
    });

    it('rejects empty roles', async () => {
        const user = createUser();
        const userRepository = new UserRepositorySpy(user);
        const useCase = new UpdateUserUseCase({ userRepository, now: () => fixedNow });

        const result = await useCase.execute({
            userId: 'user-1',
            roles: [],
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidUserRolesError);
        }
    });

    it('rejects deleted status update', async () => {
        const user = createUser();
        const userRepository = new UserRepositorySpy(user);
        const useCase = new UpdateUserUseCase({ userRepository, now: () => fixedNow });

        const result = await useCase.execute({
            userId: 'user-1',
            status: UserStatus.Deleted,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidUserStatusError);
        }
    });

    it('returns not found when user does not exist', async () => {
        const userRepository = new UserRepositorySpy(null);
        const useCase = new UpdateUserUseCase({ userRepository, now: () => fixedNow });

        const result = await useCase.execute({ userId: 'missing-user' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(UserNotFoundError);
        }
    });
});
