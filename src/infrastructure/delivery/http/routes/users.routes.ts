import type { FastifyInstance } from 'fastify';
import type { AuthorizeRequestUseCase } from '@application/use-cases/authorize-request.use-case.js';
import type {
    UsersController,
    UpdateOwnProfileBody,
    UpdateOwnPasswordBody,
} from '@infrastructure/delivery/http/controllers/users.controller.js';
import { buildAuthorizeMiddleware } from '@infrastructure/delivery/http/middlewares/authorize.middleware.js';
import { usersSchemas } from '@infrastructure/delivery/http/schemas/users.schemas.js';

export const registerUsersRoutes = async (
    app: FastifyInstance,
    controller: UsersController,
    authorizeRequestUseCase: AuthorizeRequestUseCase,
): Promise<void> => {
    app.patch<{ Body: UpdateOwnProfileBody }>(
        '/users/me',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: usersSchemas.updateOwnProfile,
        },
        async (request, reply) => controller.updateOwnProfile(request, reply),
    );

    app.post<{ Body: UpdateOwnPasswordBody }>(
        '/users/me/password',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: usersSchemas.changeOwnPassword,
        },
        async (request, reply) => controller.changeOwnPassword(request, reply),
    );
};
