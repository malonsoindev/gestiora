import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthorizeRequestUseCase } from '../../../../application/use-cases/authorize-request.use-case.js';
import { AuthorizationError } from '../../../../application/errors/authorization.error.js';
import { PortError } from '../../../../application/errors/port.error.js';

export const buildAuthorizeMiddleware = (
    authorizeRequestUseCase: AuthorizeRequestUseCase,
    requiresAdmin: boolean,
) => {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        const authHeader = request.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

        const authRequest = {
            requiresAdmin,
            ...(token ? { token } : {}),
        };

        const result = await authorizeRequestUseCase.execute(authRequest);

        if (result.success) {
            return;
        }

        if (result.error instanceof AuthorizationError) {
            const status = result.error.code === 'FORBIDDEN' ? 403 : 401;
            await reply.code(status).send({ error: result.error.code });
            return;
        }

        if (result.error instanceof PortError) {
            await reply.code(500).send({ error: 'INTERNAL_ERROR' });
            return;
        }

        await reply.code(500).send({ error: 'INTERNAL_ERROR' });
    };
};
