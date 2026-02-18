import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateUserUseCase } from '@application/use-cases/create-user.use-case.js';
import type { ListUsersUseCase } from '@application/use-cases/list-users.use-case.js';
import type { GetUserDetailUseCase } from '@application/use-cases/get-user-detail.use-case.js';
import type { UpdateUserUseCase } from '@application/use-cases/update-user.use-case.js';
import type { UpdateUserStatusUseCase } from '@application/use-cases/update-user-status.use-case.js';
import type { SoftDeleteUserUseCase } from '@application/use-cases/soft-delete-user.use-case.js';
import type { RevokeUserSessionsUseCase } from '@application/use-cases/revoke-user-sessions.use-case.js';
import type { ChangeUserPasswordUseCase } from '@application/use-cases/change-user-password.use-case.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { UserStatus } from '@domain/entities/user.entity.js';
import { respondError } from '@infrastructure/delivery/http/errors/respond-error.js';
import { getPaginationParams } from '@shared/pagination.js';

export type AdminCreateUserBody = {
    email: string;
    password: string;
    roles: Array<'Usuario' | 'Administrador'>;
    status?: 'ACTIVE' | 'INACTIVE' | 'DELETED';
    name?: string;
    avatar?: string;
};

export type AdminUpdateUserBody = {
    roles?: Array<'Usuario' | 'Administrador'>;
    status?: 'ACTIVE' | 'INACTIVE' | 'DELETED';
    name?: string;
    avatar?: string;
};

export type AdminChangePasswordBody = {
    newPassword: string;
};

type AdminUserStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED';
type AdminUserRole = 'Usuario' | 'Administrador';
type AdminListUsersQuery = {
    status?: AdminUserStatus;
    role?: AdminUserRole;
    page?: number;
    pageSize?: number;
};
type AdminUpdateUserStatusBody = {
    status: AdminUserStatus;
};

export class AdminUsersController {
    constructor(
        private readonly createUserUseCase: CreateUserUseCase,
        private readonly listUsersUseCase: ListUsersUseCase,
        private readonly getUserDetailUseCase: GetUserDetailUseCase,
        private readonly updateUserUseCase: UpdateUserUseCase,
        private readonly updateUserStatusUseCase: UpdateUserStatusUseCase,
        private readonly softDeleteUserUseCase: SoftDeleteUserUseCase,
        private readonly revokeUserSessionsUseCase: RevokeUserSessionsUseCase,
        private readonly changeUserPasswordUseCase: ChangeUserPasswordUseCase,
    ) {}

    async createUser(request: FastifyRequest<{ Body: AdminCreateUserBody }>, reply: FastifyReply) {
        const actorUserId = request.auth?.userId;
        if (!actorUserId) {
            return reply.code(403).send({ error: 'FORBIDDEN' });
        }

        const roles = this.mapRoles(request.body.roles);
        if (!roles) {
            return reply.code(400).send({ error: 'INVALID_ROLE' });
        }

        const status = request.body.status ? this.mapStatus(request.body.status) : undefined;
        if (request.body.status && !status) {
            return reply.code(400).send({ error: 'INVALID_STATUS' });
        }

        const result = await this.createUserUseCase.execute({
            actorUserId,
            email: request.body.email,
            password: request.body.password,
            roles,
            ...(status ? { status } : {}),
            ...(request.body.name ? { name: request.body.name } : {}),
            ...(request.body.avatar ? { avatar: request.body.avatar } : {}),
        });

        if (result.success) {
            return reply.code(201).send(result.value);
        }

        return respondError(reply, result.error);
    }

    async listUsers(
        request: FastifyRequest<{ Querystring: AdminListUsersQuery }>,
        reply: FastifyReply,
    ) {
        const role = request.query.role ? this.mapRole(request.query.role) : undefined;
        if (request.query.role && !role) {
            return reply.code(400).send({ error: 'INVALID_ROLE' });
        }

        const status = request.query.status ? this.mapStatus(request.query.status) : undefined;
        if (request.query.status && !status) {
            return reply.code(400).send({ error: 'INVALID_STATUS' });
        }

        const { page, pageSize } = getPaginationParams(request.query);

        const result = await this.listUsersUseCase.execute({
            page,
            pageSize,
            ...(role ? { role } : {}),
            ...(status ? { status } : {}),
        });

        if (result.success) {
            return reply.code(200).send({
                items: result.value.items.map((item) => this.mapUserToListItem(item)),
                page: result.value.page,
                pageSize: result.value.pageSize,
                total: result.value.total,
            });
        }

        return respondError(reply, result.error);
    }

    async getUserDetail(
        request: FastifyRequest<{ Params: { userId: string } }>,
        reply: FastifyReply,
    ) {
        const result = await this.getUserDetailUseCase.execute({ userId: request.params.userId });

        if (result.success) {
            return reply.code(200).send(this.mapUserToDetail(result.value));
        }

        return respondError(reply, result.error);
    }

    async updateUser(
        request: FastifyRequest<{ Params: { userId: string }; Body: AdminUpdateUserBody }>,
        reply: FastifyReply,
    ) {
        const roles = request.body.roles ? this.mapRoles(request.body.roles) : undefined;
        if (request.body.roles && !roles) {
            return reply.code(400).send({ error: 'INVALID_ROLE' });
        }

        const status = request.body.status ? this.mapStatus(request.body.status) : undefined;
        if (request.body.status && !status) {
            return reply.code(400).send({ error: 'INVALID_STATUS' });
        }

        const result = await this.updateUserUseCase.execute({
            userId: request.params.userId,
            ...(request.body.name === undefined ? {} : { name: request.body.name }),
            ...(request.body.avatar === undefined ? {} : { avatar: request.body.avatar }),
            ...(roles ? { roles } : {}),
            ...(status ? { status } : {}),
        });

        if (result.success) {
            return this.respondWithUserDetail(reply, request.params.userId);
        }

        return respondError(reply, result.error);
    }

    async updateUserStatus(
        request: FastifyRequest<{ Params: { userId: string }; Body: AdminUpdateUserStatusBody }>,
        reply: FastifyReply,
    ) {
        const status = this.mapStatus(request.body.status);
        if (!status) {
            return reply.code(400).send({ error: 'INVALID_STATUS' });
        }

        const result = await this.updateUserStatusUseCase.execute({
            userId: request.params.userId,
            status,
        });

        if (result.success) {
            return this.respondWithUserDetail(reply, request.params.userId);
        }

        return respondError(reply, result.error);
    }

    async softDeleteUser(
        request: FastifyRequest<{ Params: { userId: string } }>,
        reply: FastifyReply,
    ) {
        const actorUserId = request.auth?.userId;
        if (!actorUserId) {
            return reply.code(403).send({ error: 'FORBIDDEN' });
        }

        const result = await this.softDeleteUserUseCase.execute({
            userId: request.params.userId,
            actorUserId,
        });

        if (result.success) {
            return reply.code(204).send();
        }

        return respondError(reply, result.error);
    }

    async revokeUserSessions(
        request: FastifyRequest<{ Params: { userId: string } }>,
        reply: FastifyReply,
    ) {
        const result = await this.revokeUserSessionsUseCase.execute({
            userId: request.params.userId,
        });

        if (result.success) {
            return reply.code(204).send();
        }

        return respondError(reply, result.error);
    }

    async changeUserPassword(
        request: FastifyRequest<{ Params: { userId: string }; Body: AdminChangePasswordBody }>,
        reply: FastifyReply,
    ) {
        const actorUserId = request.auth?.userId;
        if (!actorUserId) {
            return reply.code(403).send({ error: 'FORBIDDEN' });
        }

        const result = await this.changeUserPasswordUseCase.execute({
            actorUserId,
            userId: request.params.userId,
            newPassword: request.body.newPassword,
        });

        if (result.success) {
            return reply.code(204).send();
        }

        return respondError(reply, result.error);
    }

    private mapRoles(values: Array<'Usuario' | 'Administrador'>): UserRole[] | null {
        const roles = values.map((value) => {
            switch (value) {
                case 'Usuario':
                    return UserRole.user();
                case 'Administrador':
                    return UserRole.admin();
                default:
                    return null;
            }
        });

        if (roles.includes(null)) {
            return null;
        }

        return roles as UserRole[];
    }

    private async respondWithUserDetail(reply: FastifyReply, userId: string) {
        const detail = await this.getUserDetailUseCase.execute({ userId });

        if (detail.success) {
            return reply.code(200).send(this.mapUserToDetail(detail.value));
        }

        return respondError(reply, detail.error);
    }

    private mapRole(value: 'Usuario' | 'Administrador'): UserRole | null {
        switch (value) {
            case 'Usuario':
                return UserRole.user();
            case 'Administrador':
                return UserRole.admin();
            default:
                return null;
        }
    }

    private mapStatus(value: AdminUserStatus): UserStatus | null {
        switch (value) {
            case 'ACTIVE':
                return UserStatus.Active;
            case 'INACTIVE':
                return UserStatus.Inactive;
            case 'DELETED':
                return UserStatus.Deleted;
            default:
                return null;
        }
    }

    private mapStatusToApi(status: UserStatus): 'ACTIVE' | 'INACTIVE' | 'DELETED' {
        switch (status) {
            case UserStatus.Active:
                return 'ACTIVE';
            case UserStatus.Inactive:
                return 'INACTIVE';
            case UserStatus.Deleted:
                return 'DELETED';
            default:
                return 'INACTIVE';
        }
    }

    private mapRoleToApi(role: UserRole): 'Usuario' | 'Administrador' {
        return role.getValue() === 'ADMIN' ? 'Administrador' : 'Usuario';
    }

    private mapUserToListItem(user: {
        userId: string;
        email: string;
        name?: string;
        avatar?: string;
        status: UserStatus;
        roles: UserRole[];
        createdAt: Date;
    }): {
        userId: string;
        email: string;
        name?: string;
        avatar?: string;
        status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
        roles: Array<'Usuario' | 'Administrador'>;
        createdAt: string;
    } {
        return {
            userId: user.userId,
            email: user.email,
            ...(user.name ? { name: user.name } : {}),
            ...(user.avatar ? { avatar: user.avatar } : {}),
            status: this.mapStatusToApi(user.status),
            roles: user.roles.map((r) => this.mapRoleToApi(r)),
            createdAt: user.createdAt.toISOString(),
        };
    }

    private mapUserToDetail(user: {
        userId: string;
        email: string;
        name?: string;
        avatar?: string;
        status: UserStatus;
        roles: UserRole[];
        createdAt: Date;
        updatedAt: Date;
        deletedAt?: Date;
    }): {
        userId: string;
        email: string;
        name?: string;
        avatar?: string;
        status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
        roles: Array<'Usuario' | 'Administrador'>;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
    } {
        return {
            userId: user.userId,
            email: user.email,
            ...(user.name ? { name: user.name } : {}),
            ...(user.avatar ? { avatar: user.avatar } : {}),
            status: this.mapStatusToApi(user.status),
            roles: user.roles.map((r) => this.mapRoleToApi(r)),
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
        };
    }
}
