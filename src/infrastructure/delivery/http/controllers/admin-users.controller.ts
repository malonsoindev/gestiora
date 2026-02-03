import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateUserUseCase } from '../../../../application/use-cases/create-user.use-case.js';
import { InvalidEmailError } from '../../../../domain/errors/invalid-email.error.js';
import { InvalidPasswordError } from '../../../../domain/errors/invalid-password.error.js';
import { InvalidUserRolesError } from '../../../../domain/errors/invalid-user-roles.error.js';
import { InvalidUserStatusError } from '../../../../domain/errors/invalid-user-status.error.js';
import { UserAlreadyExistsError } from '../../../../domain/errors/user-already-exists.error.js';
import { UserRole } from '../../../../domain/value-objects/user-role.value-object.js';
import { UserStatus } from '../../../../domain/entities/user.entity.js';
import { PortError } from '../../../../application/errors/port.error.js';

export type AdminCreateUserBody = {
    email: string;
    password: string;
    roles: Array<'Usuario' | 'Administrador'>;
    status?: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
    name?: string;
    avatar?: string;
};

export class AdminUsersController {
    constructor(private readonly createUserUseCase: CreateUserUseCase) {}

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
            return reply.code(500).send({ error: 'INTERNAL_ERROR' });
        }

        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
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

        if (roles.some((role) => role === null)) {
            return null;
        }

        return roles as UserRole[];
    }

    private mapStatus(value: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO'): UserStatus | null {
        switch (value) {
            case 'ACTIVO':
                return UserStatus.Active;
            case 'INACTIVO':
                return UserStatus.Inactive;
            case 'ELIMINADO':
                return UserStatus.Deleted;
            default:
                return null;
        }
    }
}
