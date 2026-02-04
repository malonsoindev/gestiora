import type { FastifyInstance } from 'fastify';
import type { AuthorizeRequestUseCase } from '../../../../application/use-cases/authorize-request.use-case.js';
import type { ProvidersController, CreateProviderBody } from '../controllers/providers.controller.js';
import { buildAuthorizeMiddleware } from '../middlewares/authorize.middleware.js';
import { providersSchemas } from '../schemas/providers.schemas.js';

export const registerProvidersRoutes = async (
    app: FastifyInstance,
    controller: ProvidersController,
    authorizeRequestUseCase: AuthorizeRequestUseCase,
): Promise<void> => {
    app.post<{ Body: CreateProviderBody }>(
        '/providers',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: providersSchemas.create,
        },
        async (request, reply) => controller.createProvider(request, reply),
    );
};
