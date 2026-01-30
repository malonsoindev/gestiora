import type { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import type { AuthorizeRequestUseCase } from '../../../../application/use-cases/authorize-request.use-case.js';
import { AuthorizationError } from '../../../../application/errors/authorization.error.js';
import { PortError } from '../../../../application/errors/port.error.js';

export const buildAuthorizeMiddleware = (
    authorizeRequestUseCase: AuthorizeRequestUseCase,
    requiresAdmin: boolean,
) => {
    return (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction): void => {
        const authHeader = request.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

        const authRequest = {
            requiresAdmin,
            ...(token ? { token } : {}),
        };

        void authorizeRequestUseCase
            .execute(authRequest)
            .then((result) => {
                if (result.success) {
                    done();
                    return;
                }

                if (result.error instanceof AuthorizationError) {
                    const status = result.error.code === 'FORBIDDEN' ? 403 : 401;
                    void reply.code(status).send({ error: result.error.code });
                    return;
                }

                if (result.error instanceof PortError) {
                    void reply.code(500).send({ error: 'INTERNAL_ERROR' });
                    return;
                }

                void reply.code(500).send({ error: 'INTERNAL_ERROR' });
            })
            .catch(() => {
                void reply.code(500).send({ error: 'INTERNAL_ERROR' });
            });
    };
};
