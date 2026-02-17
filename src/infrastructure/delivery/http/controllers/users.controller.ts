import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UpdateOwnProfileUseCase } from '@application/use-cases/update-own-profile.use-case.js';
import type { ChangeOwnPasswordUseCase } from '@application/use-cases/change-own-password.use-case.js';
import { respondError } from '@infrastructure/delivery/http/errors/respond-error.js';

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

        return respondError(reply, result.error);
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

        return respondError(reply, result.error);
    }
}
