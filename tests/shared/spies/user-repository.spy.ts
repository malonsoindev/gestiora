import type { UserRepository } from '../../../src/application/ports/user.repository.js';
import type { PortError } from '../../../src/application/errors/port.error.js';
import type { User } from '../../../src/domain/entities/user.entity.js';
import type { UserRole } from '../../../src/domain/value-objects/user-role.value-object.js';
import type { UserStatus } from '../../../src/domain/entities/user.entity.js';
import { ok } from '../../../src/shared/result.js';

export class UserRepositorySpy implements UserRepository {
    createdUser: User | null = null;
    updatedUser: User | null = null;
    private readonly storedUser: User | null;

    constructor(storedUser: User | null) {
        this.storedUser = storedUser;
    }

    async findByEmail(_email: string) {
        return ok(this.storedUser);
    }

    async findById(_id: string) {
        return ok(this.storedUser);
    }

    async create(user: User) {
        this.createdUser = user;
        return ok(undefined);
    }

    async list(_filter: { status?: UserStatus; role?: UserRole; page: number; pageSize: number }): Promise<
        { success: true; value: { items: User[]; total: number } } | { success: false; error: PortError }
    > {
        return ok({ items: [], total: 0 });
    }

    async update(user: User) {
        this.updatedUser = user;
        return ok(undefined);
    }
}
