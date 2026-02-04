import type { FastifyInstance } from 'fastify';
import type { AuthorizeRequestUseCase } from '../../../../application/use-cases/authorize-request.use-case.js';
import type {
    ProvidersController,
    CreateProviderBody,
    ProvidersListQuery,
    ProviderDetailParams,
    UpdateProviderBody,
} from '../controllers/providers.controller.js';
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

    app.get<{ Querystring: ProvidersListQuery }>(
        '/providers',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: providersSchemas.list,
        },
        async (request, reply) => controller.listProviders(request, reply),
    );

    app.get<{ Params: ProviderDetailParams }>(
        '/providers/:providerId',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: providersSchemas.detail,
        },
        async (request, reply) => controller.getProviderDetail(request, reply),
    );

    app.put<{ Params: ProviderDetailParams; Body: UpdateProviderBody }>(
        '/providers/:providerId',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: providersSchemas.update,
        },
        async (request, reply) => controller.updateProvider(request, reply),
    );
};
