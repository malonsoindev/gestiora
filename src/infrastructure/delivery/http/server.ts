import path from 'node:path';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { AuthController } from '@infrastructure/delivery/http/controllers/auth.controller.js';
import { AdminController } from '@infrastructure/delivery/http/controllers/admin.controller.js';
import { AdminUsersController } from '@infrastructure/delivery/http/controllers/admin-users.controller.js';
import { UsersController } from '@infrastructure/delivery/http/controllers/users.controller.js';
import { ProvidersController } from '@infrastructure/delivery/http/controllers/providers.controller.js';
import { InvoicesController } from '@infrastructure/delivery/http/controllers/invoices.controller.js';
import { SearchController } from '@infrastructure/delivery/http/controllers/search.controller.js';
import { registerAuthRoutes } from '@infrastructure/delivery/http/routes/auth.routes.js';
import { registerAdminRoutes } from '@infrastructure/delivery/http/routes/admin.routes.js';
import { registerAdminUsersRoutes } from '@infrastructure/delivery/http/routes/admin-users.routes.js';
import { registerUsersRoutes } from '@infrastructure/delivery/http/routes/users.routes.js';
import { registerProvidersRoutes } from '@infrastructure/delivery/http/routes/providers.routes.js';
import { registerInvoicesRoutes } from '@infrastructure/delivery/http/routes/invoices.routes.js';
import { registerSearchRoutes } from '@infrastructure/delivery/http/routes/search.routes.js';
import { compositionRoot } from '@composition/index.js';
import { config, isDevelopment, isProduction, type Config } from '@config/env.js';

/**
 * Resolves CORS origin configuration from environment config.
 * Returns undefined to disable CORS, true for wildcard, or specific origins.
 */
const resolveCorsOrigin = (cfg: Config): boolean | string | string[] | undefined => {
    if (cfg.CORS === false) {
        return undefined;
    }

    if (cfg.CORS === true) {
        return true;
    }

    if (typeof cfg.CORS === 'string') {
        return cfg.CORS;
    }

    if (Array.isArray(cfg.CORS)) {
        return cfg.CORS;
    }

    if (isDevelopment(cfg)) {
        return true;
    }

    return undefined;
};

export const buildServer = async (): Promise<FastifyInstance> => {
    const app = Fastify({ logger: true });
    const corsOrigin = resolveCorsOrigin(config);

    if (!isProduction() || corsOrigin !== undefined) {
        if (corsOrigin !== undefined) {
            await app.register(fastifyCors, { origin: corsOrigin });
        }
    }

    if (config.SWAGGER === true) {
        await app.register(swagger, {
            openapi: {
                info: {
                    title: 'Gestiora API',
                    version: '0.1.0',
                },
                components: {
                    securitySchemes: {
                        bearerAuth: {
                            type: 'http',
                            scheme: 'bearer',
                            bearerFormat: 'JWT',
                        },
                    },
                },
            },
        });

        await app.register(swaggerUi, {
            routePrefix: '/docs',
        });
    }

    await app.register(fastifyMultipart);

    // Añadimos un error handler personalizado para manejar errores de validación y otros errores generales
    // y devolver respuestas JSON consistentes.
    const isObject = (value: unknown): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null;

    app.setErrorHandler((error, _request, reply) => {
        app.log.error({ err: error }, 'Unhandled error');
        const statusCode = isObject(error) && typeof error.statusCode === 'number' ? error.statusCode : 500;
        const message = isObject(error) && typeof error.message === 'string' ? error.message : 'Internal error';

        if (statusCode === 400 && isObject(error) && 'validation' in error) {
            return reply.code(400).send({ error: 'VALIDATION_ERROR', message });
        }

        return reply.code(statusCode).send({ error: 'INTERNAL_ERROR' });
    });

    await app.register(fastifyStatic, {
        root: path.join(process.cwd(), 'public'),
        prefix: '/',
        index: ['index.html'],
    });

    app.get('/', async (_request, reply) => reply.sendFile('index.html'));

    const authController = new AuthController(
        compositionRoot.loginUserUseCase,
        compositionRoot.refreshAccessTokenUseCase,
        compositionRoot.logoutUserUseCase,
    );
    const adminController = new AdminController();
    const adminUsersController = new AdminUsersController(
        compositionRoot.createUserUseCase,
        compositionRoot.listUsersUseCase,
        compositionRoot.getUserDetailUseCase,
        compositionRoot.updateUserUseCase,
        compositionRoot.updateUserStatusUseCase,
        compositionRoot.softDeleteUserUseCase,
        compositionRoot.revokeUserSessionsUseCase,
        compositionRoot.changeUserPasswordUseCase,
    );
    const usersController = new UsersController(
        compositionRoot.updateOwnProfileUseCase,
        compositionRoot.changeOwnPasswordUseCase,
    );
    const providersController = new ProvidersController(
        compositionRoot.createProviderUseCase,
        compositionRoot.listProvidersUseCase,
        compositionRoot.getProviderDetailUseCase,
        compositionRoot.updateProviderUseCase,
        compositionRoot.updateProviderStatusUseCase,
        compositionRoot.softDeleteProviderUseCase,
    );
    const invoicesController = new InvoicesController(
        compositionRoot.createManualInvoiceUseCase,
        compositionRoot.attachInvoiceFileUseCase,
        compositionRoot.updateManualInvoiceUseCase,
        compositionRoot.listInvoicesUseCase,
        compositionRoot.getInvoiceDetailUseCase,
        compositionRoot.softDeleteInvoiceUseCase,
        compositionRoot.getInvoiceFileUseCase,
        compositionRoot.uploadInvoiceDocumentUseCase,
        compositionRoot.confirmInvoiceMovementsUseCase,
        compositionRoot.confirmInvoiceHeaderUseCase,
        compositionRoot.reprocessInvoiceExtractionUseCase,
    );
    const searchController = new SearchController(
        compositionRoot.processSearchQueryUseCase,
        compositionRoot.getSearchResultUseCase,
    );

    await registerAuthRoutes(app, authController, compositionRoot.authorizeRequestUseCase);
    await registerAdminRoutes(app, adminController, compositionRoot.authorizeRequestUseCase);
    await registerAdminUsersRoutes(app, adminUsersController, compositionRoot.authorizeRequestUseCase);
    await registerUsersRoutes(app, usersController, compositionRoot.authorizeRequestUseCase);
    await registerProvidersRoutes(app, providersController, compositionRoot.authorizeRequestUseCase);
    await registerInvoicesRoutes(app, invoicesController, compositionRoot.authorizeRequestUseCase);
    await registerSearchRoutes(app, searchController, compositionRoot.authorizeRequestUseCase);

    return app;
};
