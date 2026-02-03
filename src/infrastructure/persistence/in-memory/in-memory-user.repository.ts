import { ok, type Result } from '../../../shared/result.js';
import { PortError } from '../../../application/errors/port.error.js';
import type { UserRepository } from '../../../application/ports/user.repository.js';
import type { User } from '../../../domain/entities/user.entity.js';
import type { UserStatus } from '../../../domain/entities/user.entity.js';
import type { UserRole } from '../../../domain/value-objects/user-role.value-object.js';

export class InMemoryUserRepository implements UserRepository {
    private readonly usersById = new Map<string, User>();
    private readonly usersByEmail = new Map<string, User>();

    constructor(initialUsers: User[] = []) {
        initialUsers.forEach((user) => this.add(user));
    }

    add(user: User): void {
        this.usersById.set(user.id, user);
        this.usersByEmail.set(user.email, user);
    }

    async findByEmail(email: string): Promise<Result<User | null, PortError>> {
        return ok(this.usersByEmail.get(email) ?? null);
    }

    async findById(id: string): Promise<Result<User | null, PortError>> {
        return ok(this.usersById.get(id) ?? null);
    }

    async create(user: User): Promise<Result<void, PortError>> {
        this.add(user);
        return ok(undefined);
    }

    async list(filter: {
        status?: UserStatus;
        role?: UserRole;
        page: number;
        pageSize: number;
    }): Promise<Result<{ items: User[]; total: number }, PortError>> {
        const allUsers = Array.from(this.usersById.values());
        const filtered = allUsers.filter((user) => {
            if (filter.status && user.status !== filter.status) {
                return false;
            }
            if (filter.role && !user.roles.some((role) => role.getValue() === filter.role?.getValue())) {
                return false;
            }
            return true;
        });

        const total = filtered.length;
        const start = (filter.page - 1) * filter.pageSize;
        const items = filtered.slice(start, start + filter.pageSize);

        return ok({ items, total });
    }
}
