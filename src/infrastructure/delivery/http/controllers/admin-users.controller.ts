import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateUserUseCase } from '@application/use-cases/create-user.use-case.js';
import type { ListUsersUseCase } from '@application/use-cases/list-users.use-case.js';
import type { GetUserDetailUseCase } from '@application/use-cases/get-user-detail.use-case.js';
import type { UpdateUserUseCase } from '@application/use-cases/update-user.use-case.js';
import type { UpdateUserStatusUseCase } from '@application/use-cases/update-user-status.use-case.js';
import type { SoftDeleteUserUseCase } from '@application/use-cases/soft-delete-user.use-case.js';
import type { RevokeUserSessionsUseCase } from '@application/use-cases/revoke-user-sessions.use-case.js';
import type { ChangeUserPasswordUseCase } from '@application/use-cases/change-user-password.use-case.js';
import { InvalidEmailError } from '@domain/errors/invalid-email.error.js';
import { InvalidPasswordError } from '@domain/errors/invalid-password.error.js';
import { InvalidUserRolesError } from '@domain/errors/invalid-user-roles.error.js';
import { InvalidUserStatusError } from '@domain/errors/invalid-user-status.error.js';
import { UserAlreadyExistsError } from '@domain/errors/user-already-exists.error.js';
import { UserNotFoundError } from '@domain/errors/user-not-found.error.js';
import { SelfDeletionNotAllowedError } from '@domain/errors/self-deletion-not-allowed.error.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { UserStatus } from '@domain/entities/user.entity.js';
import { PortError } from '@application/errors/port.error.js';
import { sendInternalError } from '@infrastructure/delivery/http/errors/internal-error-response.js';

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

        if (result.error instanceof UserAlreadyExistsError) {
            return reply.code(400).send({ error: 'USER_ALREADY_EXISTS' });
        }

        if (
            result.error instanceof InvalidEmailError ||
            result.error instanceof InvalidPasswordError ||
            result.error instanceof InvalidUserRolesError ||
            result.error instanceof InvalidUserStatusError
        ) {
            return reply.code(400).send({ error: 'VALIDATION_ERROR' });
        }

        if (result.error instanceof PortError) {
            return sendInternalError(reply);
        }

        return sendInternalError(reply);
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

        const page = request.query.page ?? 1;
        const pageSize = request.query.pageSize ?? 20;

        const result = await this.listUsersUseCase.execute({
            page,
            pageSize,
            ...(role ? { role } : {}),
            ...(status ? { status } : {}),
        });

        if (result.success) {
            return reply.code(200).send({
                items: result.value.items.map((item) => ({
                    userId: item.userId,
                    email: item.email,
                    ...(item.name ? { name: item.name } : {}),
                    ...(item.avatar ? { avatar: item.avatar } : {}),
                    status: this.mapStatusToApi(item.status),
                    roles: item.roles.map((r) => this.mapRoleToApi(r)),
                    createdAt: item.createdAt.toISOString(),
                })),
                page: result.value.page,
                pageSize: result.value.pageSize,
                total: result.value.total,
            });
        }

        return sendInternalError(reply);
    }

    async getUserDetail(
        request: FastifyRequest<{ Params: { userId: string } }>,
        reply: FastifyReply,
    ) {
        const result = await this.getUserDetailUseCase.execute({ userId: request.params.userId });

        if (result.success) {
            return reply.code(200).send({
                userId: result.value.userId,
                email: result.value.email,
                ...(result.value.name ? { name: result.value.name } : {}),
                ...(result.value.avatar ? { avatar: result.value.avatar } : {}),
                status: this.mapStatusToApi(result.value.status),
                roles: result.value.roles.map((role) => this.mapRoleToApi(role)),
                createdAt: result.value.createdAt.toISOString(),
                updatedAt: result.value.updatedAt.toISOString(),
                deletedAt: result.value.deletedAt ? result.value.deletedAt.toISOString() : null,
            });
        }

        if (result.error instanceof UserNotFoundError) {
            return reply.code(404).send({ error: 'NOT_FOUND' });
        }

        return sendInternalError(reply);
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

        if (result.error instanceof UserNotFoundError) {
            return reply.code(404).send({ error: 'NOT_FOUND' });
        }

        if (
            result.error instanceof InvalidUserRolesError ||
            result.error instanceof InvalidUserStatusError
        ) {
            return reply.code(400).send({ error: 'VALIDATION_ERROR' });
        }

        return sendInternalError(reply);
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

        if (result.error instanceof UserNotFoundError) {
            return reply.code(404).send({ error: 'NOT_FOUND' });
        }

        if (result.error instanceof InvalidUserStatusError) {
            return reply.code(400).send({ error: 'VALIDATION_ERROR' });
        }

        return sendInternalError(reply);
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

        if (result.error instanceof UserNotFoundError) {
            return reply.code(404).send({ error: 'NOT_FOUND' });
        }

        if (result.error instanceof SelfDeletionNotAllowedError) {
            return reply.code(400).send({ error: 'SELF_DELETE_NOT_ALLOWED' });
        }

        return sendInternalError(reply);
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

        if (result.error instanceof UserNotFoundError) {
            return reply.code(404).send({ error: 'NOT_FOUND' });
        }

        return sendInternalError(reply);
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

        if (result.error instanceof UserNotFoundError) {
            return reply.code(404).send({ error: 'NOT_FOUND' });
        }

        if (result.error instanceof InvalidPasswordError) {
            return reply.code(400).send({ error: 'VALIDATION_ERROR' });
        }

        if (result.error instanceof PortError) {
            return sendInternalError(reply);
        }

        return sendInternalError(reply);
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
            return reply.code(200).send({
                userId: detail.value.userId,
                email: detail.value.email,
                ...(detail.value.name ? { name: detail.value.name } : {}),
                ...(detail.value.avatar ? { avatar: detail.value.avatar } : {}),
                status: this.mapStatusToApi(detail.value.status),
                roles: detail.value.roles.map((role) => this.mapRoleToApi(role)),
                createdAt: detail.value.createdAt.toISOString(),
                updatedAt: detail.value.updatedAt.toISOString(),
                deletedAt: detail.value.deletedAt ? detail.value.deletedAt.toISOString() : null,
            });
        }

        if (detail.error instanceof UserNotFoundError) {
            return reply.code(404).send({ error: 'NOT_FOUND' });
        }

        return sendInternalError(reply);
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

    private mapStatus(value: 'ACTIVE' | 'INACTIVE' | 'DELETED'): UserStatus | null {
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
}
