import type { FastifyInstance } from 'fastify';
import type { AuthController, AuthLoginBody, AuthRefreshBody } from '../controllers/auth.controller.js';
import type { AuthorizeRequestUseCase } from '../../../../application/use-cases/authorize-request.use-case.js';
import { buildAuthorizeMiddleware } from '../middlewares/authorize.middleware.js';

export const registerAuthRoutes = async (
    app: FastifyInstance,
    controller: AuthController,
    authorizeRequestUseCase: AuthorizeRequestUseCase,
): Promise<void> => {
    app.post<{ Body: AuthLoginBody }>(
        '/auth/login',
        async (request, reply) => controller.login(request, reply),
    );
    app.post<{ Body: AuthRefreshBody }>(
        '/auth/refresh',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
        },
        async (request, reply) => controller.refresh(request, reply),
    );
    app.post<{ Body: AuthRefreshBody }>(
        '/auth/logout',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
        },
        async (request, reply) => controller.logout(request, reply),
    );
};
