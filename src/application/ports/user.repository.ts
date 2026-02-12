import { User, UserStatus } from '@domain/entities/user.entity.js';
import type { UserRole } from '@domain/value-objects/user-role.value-object.js';
import type { Result } from '@shared/result.js';
import type { PortError } from '@application/errors/port.error.js';

export interface UserRepository {
    findByEmail(email: string): Promise<Result<User | null, PortError>>;
    findById(id: string): Promise<Result<User | null, PortError>>;
    create(user: User): Promise<Result<void, PortError>>;
    list(filter: {
        status?: UserStatus;
        role?: UserRole;
        page: number;
        pageSize: number;
    }): Promise<Result<{ items: User[]; total: number }, PortError>>;
    update(user: User): Promise<Result<void, PortError>>;
}
