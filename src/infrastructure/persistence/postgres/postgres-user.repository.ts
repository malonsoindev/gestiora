import type { Sql } from 'postgres';
import { fail, ok, type Result } from '../../../shared/result.js';
import { toDate } from '../../../shared/date-utils.js';
import { PortError } from '../../../application/errors/port.error.js';
import type { UserRepository } from '../../../application/ports/user.repository.js';
import { User, UserStatus } from '../../../domain/entities/user.entity.js';
import { UserRole } from '../../../domain/value-objects/user-role.value-object.js';

type SqlClient = Sql<{}>;

export class PostgresUserRepository implements UserRepository {
    constructor(private readonly sql: SqlClient) {}

    async findByEmail(email: string): Promise<Result<User | null, PortError>> {
        try {
            const rows = await this.sql`
                select id, email, password_hash, status, locked_until, roles, created_at, updated_at
                from users
                where email = ${email}
                limit 1
            `;

            const row = rows[0];
            if (!row) {
                return ok(null);
            }

            return ok(this.mapRowToUser(row));
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('UserRepository', 'Failed to fetch user by email', cause));
        }
    }

    async findById(id: string): Promise<Result<User | null, PortError>> {
        try {
            const rows = await this.sql`
                select id, email, password_hash, status, locked_until, roles, created_at, updated_at
                from users
                where id = ${id}
                limit 1
            `;

            const row = rows[0];
            if (!row) {
                return ok(null);
            }

            return ok(this.mapRowToUser(row));
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('UserRepository', 'Failed to fetch user by id', cause));
        }
    }

    private mapRowToUser(row: Record<string, unknown>): User {
        const statusValue = String(row.status);
        const status = this.mapStatus(statusValue);
        const roles = Array.isArray(row.roles)
            ? row.roles.map((role) => UserRole.create(String(role) as 'USER' | 'ADMIN'))
            : [];

        return User.create({
            id: String(row.id),
            email: String(row.email),
            passwordHash: String(row.password_hash),
            status,
            ...(row.locked_until ? { lockedUntil: toDate(row.locked_until) } : {}),
            roles,
            createdAt: toDate(row.created_at),
            updatedAt: toDate(row.updated_at),
        });
    }

    private mapStatus(value: string): UserStatus {
        switch (value) {
            case UserStatus.Active:
                return UserStatus.Active;
            case UserStatus.Inactive:
                return UserStatus.Inactive;
            case UserStatus.Deleted:
                return UserStatus.Deleted;
            default:
                return UserStatus.Inactive;
        }
    }
}
