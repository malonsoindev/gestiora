import { ok, type Result } from '../../../shared/result.js';
import { PortError } from '../../../application/errors/port.error.js';
import type { UserRepository } from '../../../application/ports/user.repository.js';
import type { User } from '../../../domain/entities/user.entity.js';

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
}
