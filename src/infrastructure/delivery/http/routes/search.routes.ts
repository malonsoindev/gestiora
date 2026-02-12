import type { FastifyInstance } from 'fastify';
import type { AuthorizeRequestUseCase } from '@application/use-cases/authorize-request.use-case.js';
import type { SearchController, SearchBody } from '@infrastructure/delivery/http/controllers/search.controller.js';
import { buildAuthorizeMiddleware } from '@infrastructure/delivery/http/middlewares/authorize.middleware.js';
import { searchSchemas } from '@infrastructure/delivery/http/schemas/search.schemas.js';

export const registerSearchRoutes = async (
    app: FastifyInstance,
    controller: SearchController,
    authorizeRequestUseCase: AuthorizeRequestUseCase,
): Promise<void> => {
    app.post<{ Body: SearchBody }>(
        '/search',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: searchSchemas.search,
        },
        async (request, reply) => controller.search(request, reply),
    );

    app.get<{ Params: { queryId: string } }>(
        '/search/:queryId',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: searchSchemas.getById,
        },
        async (request, reply) => controller.getById(request, reply),
    );
};
