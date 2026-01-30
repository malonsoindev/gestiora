import type { FastifyInstance } from 'fastify';
import type { AuthorizeRequestUseCase } from '../../../../application/use-cases/authorize-request.use-case.js';
import type { AdminController } from '../controllers/admin.controller.js';
import { buildAuthorizeMiddleware } from '../middlewares/authorize.middleware.js';

export const registerAdminRoutes = async (
    app: FastifyInstance,
    controller: AdminController,
    authorizeRequestUseCase: AuthorizeRequestUseCase,
): Promise<void> => {
    app.get(
        '/admin/ping',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, true),
        },
        async (request, reply) => controller.ping(request, reply),
    );
};
