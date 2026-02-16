import type { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import type { AuthorizeRequestUseCase } from '@application/use-cases/authorize-request.use-case.js';
import { AuthorizationError } from '@application/errors/authorization.error.js';
import { PortError } from '@application/errors/port.error.js';
import { sendInternalError } from '@infrastructure/delivery/http/errors/internal-error-response.js';

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
                    request.auth = result.value;
                    done();
                    return;
                }

                if (result.error instanceof AuthorizationError) {
                    const status = result.error.code === 'FORBIDDEN' ? 403 : 401;
                    return reply.code(status).send({ error: result.error.code });
                }

                if (result.error instanceof PortError) {
                    return sendInternalError(reply);
                }

                return sendInternalError(reply);
            })
            .catch(() => {
                return sendInternalError(reply);
            });
    };
};
