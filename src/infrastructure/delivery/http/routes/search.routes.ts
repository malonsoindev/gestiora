import type { FastifyInstance } from 'fastify';
import type { AuthorizeRequestUseCase } from '../../../../application/use-cases/authorize-request.use-case.js';
import type { SearchController, SearchBody } from '../controllers/search.controller.js';
import { buildAuthorizeMiddleware } from '../middlewares/authorize.middleware.js';
import { searchSchemas } from '../schemas/search.schemas.js';

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
};
