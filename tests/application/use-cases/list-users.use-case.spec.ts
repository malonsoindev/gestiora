import { describe, expect, it } from 'vitest';
import { ListUsersUseCase } from '@application/use-cases/list-users.use-case.js';
import type { UserRepository } from '@application/ports/user.repository.js';
import { User, UserStatus } from '@domain/entities/user.entity.js';
import type { UserProps } from '@domain/entities/user.entity.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { Email } from '@domain/value-objects/email.value-object.js';
import { ok } from '@shared/result.js';

const fixedNow = new Date('2026-02-03T10:00:00.000Z');

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
        ...overrides,
    });

class UserRepositoryStub implements UserRepository {
    constructor(private readonly users: User[], private readonly total: number) {}

    async findByEmail() {
        return ok(null);
    }

    async findById() {
        return ok(null);
    }

    async create() {
        return ok(undefined);
    }

    async list() {
        return ok({ items: this.users, total: this.total });
    }

    async update() {
        return ok(undefined);
    }
}

class UserRepositorySpy implements UserRepository {
    lastFilter: { status?: UserStatus; role?: UserRole; page: number; pageSize: number } | null = null;

    async findByEmail() {
        return ok(null);
    }

    async findById() {
        return ok(null);
    }

    async create() {
        return ok(undefined);
    }

    async list(filter: { status?: UserStatus; role?: UserRole; page: number; pageSize: number }) {
        this.lastFilter = filter;
        return ok({ items: [], total: 0 });
    }

    async update() {
        return ok(undefined);
    }
}

describe('ListUsersUseCase', () => {
    it('returns a paginated list with totals', async () => {
        const users = [
            createUser({ id: 'user-1', email: Email.create('a@example.com') }),
            createUser({ id: 'user-2', email: Email.create('b@example.com') }),
        ];
        const userRepository = new UserRepositoryStub(users, 3);
        const useCase = new ListUsersUseCase({ userRepository });

        const result = await useCase.execute({ page: 1, pageSize: 2 });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.items).toHaveLength(2);
            expect(result.value.total).toBe(3);
            expect(result.value.page).toBe(1);
            expect(result.value.pageSize).toBe(2);
            expect(result.value.items[0]?.userId).toBe('user-1');
        }
    });

    it('passes filters to repository', async () => {
        const userRepository = new UserRepositorySpy();
        const useCase = new ListUsersUseCase({ userRepository });

        const roleFilter = UserRole.admin();
        const statusFilter = UserStatus.Inactive;

        await useCase.execute({
            page: 2,
            pageSize: 5,
            role: roleFilter,
            status: statusFilter,
        });

        expect(userRepository.lastFilter).toEqual({
            page: 2,
            pageSize: 5,
            role: roleFilter,
            status: statusFilter,
        });
    });

    it('does not expose password hash in the response', async () => {
        const users = [createUser({ id: 'user-1', email: Email.create('c@example.com') })];
        const userRepository = new UserRepositoryStub(users, 1);
        const useCase = new ListUsersUseCase({ userRepository });

        const result = await useCase.execute({ page: 1, pageSize: 10 });

        expect(result.success).toBe(true);
        if (result.success) {
            const item = result.value.items[0] as Record<string, unknown>;
            expect('passwordHash' in item).toBe(false);
        }
    });
});
