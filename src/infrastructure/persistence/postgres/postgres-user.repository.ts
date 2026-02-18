import type { Sql } from 'postgres';
import { fail, ok, type Result } from '@shared/result.js';
import { toDate } from '@shared/date-utils.js';
import { mapEnumValue } from '@shared/enum-utils.js';
import { PortError } from '@application/errors/port.error.js';
import type { UserRepository } from '@application/ports/user.repository.js';
import { User, UserStatus } from '@domain/entities/user.entity.js';
import { Email } from '@domain/value-objects/email.value-object.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';

type SqlClient = Sql<{}>;

export class PostgresUserRepository implements UserRepository {
    constructor(private readonly sql: SqlClient) {}

    async findByEmail(email: string): Promise<Result<User | null, PortError>> {
        try {
            const rows = await this.sql`
                select id, email, password_hash, name, avatar, status, locked_until, roles, created_at, updated_at
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
                select id, email, password_hash, name, avatar, status, locked_until, roles, created_at, updated_at
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
        const status = mapEnumValue(UserStatus, statusValue, UserStatus.Inactive);
        const roles = Array.isArray(row.roles)
            ? row.roles.map((role) => UserRole.create(String(role) as 'USER' | 'ADMIN'))
            : [];

        const name = typeof row.name === 'string' ? row.name : undefined;
        const avatar = typeof row.avatar === 'string' ? row.avatar : undefined;

        return User.create({
            id: String(row.id),
            email: Email.create(String(row.email)),
            passwordHash: String(row.password_hash),
            status,
            ...(name ? { name } : {}),
            ...(avatar ? { avatar } : {}),
            ...(row.locked_until ? { lockedUntil: toDate(row.locked_until) } : {}),
            roles,
            createdAt: toDate(row.created_at),
            updatedAt: toDate(row.updated_at),
        });
    }

    async create(user: User): Promise<Result<void, PortError>> {
        try {
            await this.sql`
                insert into users (
                    id,
                    email,
                    password_hash,
                    status,
                    locked_until,
                    roles,
                    created_at,
                    updated_at
                ) values (
                    ${user.id},
                    ${user.email},
                    ${user.passwordHash},
                    ${user.status},
                    ${user.lockedUntil ?? null},
                    ${user.roles.map((role) => role.getValue())},
                    ${user.createdAt},
                    ${user.updatedAt}
                )
            `;

            return ok(undefined);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('UserRepository', 'Failed to create user', cause));
        }
    }

    async list(filter: {
        status?: UserStatus;
        role?: UserRole;
        page: number;
        pageSize: number;
    }): Promise<Result<{ items: User[]; total: number }, PortError>> {
        try {
            const offset = (filter.page - 1) * filter.pageSize;
            const rows = await this.sql`
                select id, email, password_hash, name, avatar, status, locked_until, roles, created_at, updated_at
                from users
                where (${filter.status ?? null}::text is null or status = ${filter.status ?? null})
                  and (${filter.role?.getValue() ?? null}::text is null or ${filter.role?.getValue() ?? null} = any(roles))
                order by created_at desc
                limit ${filter.pageSize}
                offset ${offset}
            `;

            const totalResult = await this.sql`
                select count(*)::int as count
                from users
                where (${filter.status ?? null}::text is null or status = ${filter.status ?? null})
                  and (${filter.role?.getValue() ?? null}::text is null or ${filter.role?.getValue() ?? null} = any(roles))
            `;

            const total = totalResult[0]?.count ?? 0;
            const items = rows.map((row) => this.mapRowToUser(row));

            return ok({ items, total });
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('UserRepository', 'Failed to list users', cause));
        }
    }

    async update(user: User): Promise<Result<void, PortError>> {
        try {
            await this.sql`
                update users
                set
                    name = ${user.name ?? null},
                    avatar = ${user.avatar ?? null},
                    status = ${user.status},
                    roles = ${user.roles.map((role) => role.getValue())},
                    password_hash = ${user.passwordHash},
                    updated_at = ${user.updatedAt},
                    deleted_at = ${user.deletedAt ?? null}
                where id = ${user.id}
            `;

            return ok(undefined);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('UserRepository', 'Failed to update user', cause));
        }
    }
}

