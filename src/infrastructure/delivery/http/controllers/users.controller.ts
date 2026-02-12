import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UpdateOwnProfileUseCase } from '@application/use-cases/update-own-profile.use-case.js';
import type { ChangeOwnPasswordUseCase } from '@application/use-cases/change-own-password.use-case.js';
import { UserNotFoundError } from '@domain/errors/user-not-found.error.js';
import { InvalidPasswordError } from '@domain/errors/invalid-password.error.js';
import { AuthInvalidCredentialsError } from '@domain/errors/auth-invalid-credentials.error.js';
import { PortError } from '@application/errors/port.error.js';

export type UpdateOwnProfileBody = {
    name?: string;
    avatar?: string;
};

export type UpdateOwnPasswordBody = {
    currentPassword: string;
    newPassword: string;
};

export class UsersController {
    constructor(
        private readonly updateOwnProfileUseCase: UpdateOwnProfileUseCase,
        private readonly changeOwnPasswordUseCase: ChangeOwnPasswordUseCase,
    ) {}

    async updateOwnProfile(
        request: FastifyRequest<{ Body: UpdateOwnProfileBody }>,
        reply: FastifyReply,
    ) {
        const actorUserId = request.auth?.userId;
        if (!actorUserId) {
            return reply.code(401).send({ error: 'UNAUTHORIZED' });
        }

        const result = await this.updateOwnProfileUseCase.execute({
            actorUserId,
            ...(request.body.name === undefined ? {} : { name: request.body.name }),
            ...(request.body.avatar === undefined ? {} : { avatar: request.body.avatar }),
        });

        if (result.success) {
            return reply.code(204).send();
        }

        if (result.error instanceof UserNotFoundError) {
            return reply.code(404).send({ error: 'NOT_FOUND' });
        }

        if (result.error instanceof PortError) {
            return reply.code(500).send({ error: 'INTERNAL_ERROR' });
        }

        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
    }

    async changeOwnPassword(
        request: FastifyRequest<{ Body: UpdateOwnPasswordBody }>,
        reply: FastifyReply,
    ) {
        const actorUserId = request.auth?.userId;
        if (!actorUserId) {
            return reply.code(401).send({ error: 'UNAUTHORIZED' });
        }

        const result = await this.changeOwnPasswordUseCase.execute({
            actorUserId,
            currentPassword: request.body.currentPassword,
            newPassword: request.body.newPassword,
        });

        if (result.success) {
            return reply.code(204).send();
        }

        if (result.error instanceof AuthInvalidCredentialsError) {
            return reply.code(401).send({ error: 'AUTH_INVALID_CREDENTIALS' });
        }

        if (result.error instanceof InvalidPasswordError) {
            return reply.code(400).send({ error: 'VALIDATION_ERROR' });
        }

        if (result.error instanceof UserNotFoundError) {
            return reply.code(404).send({ error: 'NOT_FOUND' });
        }

        if (result.error instanceof PortError) {
            return reply.code(500).send({ error: 'INTERNAL_ERROR' });
        }

        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
    }
}
