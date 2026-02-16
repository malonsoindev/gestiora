import type { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import type { AuthorizeRequestUseCase } from '@application/use-cases/authorize-request.use-case.js';
import { respondError } from '@infrastructure/delivery/http/errors/respond-error.js';

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

                return respondError(reply, result.error);
            })
            .catch((error) => {
                return respondError(reply, error);
            });
    };
};
