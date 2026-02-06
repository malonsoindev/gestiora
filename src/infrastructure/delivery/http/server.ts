import path from 'node:path';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { AuthController } from './controllers/auth.controller.js';
import { AdminController } from './controllers/admin.controller.js';
import { AdminUsersController } from './controllers/admin-users.controller.js';
import { UsersController } from './controllers/users.controller.js';
import { ProvidersController } from './controllers/providers.controller.js';
import { InvoicesController } from './controllers/invoices.controller.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerAdminRoutes } from './routes/admin.routes.js';
import { registerAdminUsersRoutes } from './routes/admin-users.routes.js';
import { registerUsersRoutes } from './routes/users.routes.js';
import { registerProvidersRoutes } from './routes/providers.routes.js';
import { registerInvoicesRoutes } from './routes/invoices.routes.js';
import { compositionRoot } from '../../../composition/index.js';
import { config, isDevelopment, isProduction } from '../../../config/env.js';

export const buildServer = async (): Promise<FastifyInstance> => {
    const app = Fastify({ logger: true });
    const corsOrigin = (() => {
        if (config.CORS === false) {
            return undefined;
        }

        if (config.CORS === true) {
            return true;
        }

        if (typeof config.CORS === 'string') {
            return config.CORS;
        }

        if (Array.isArray(config.CORS)) {
            return config.CORS;
        }

        if (isDevelopment()) {
            return true;
        }

        return undefined;
    })();

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
    );
    const usersController = new UsersController(compositionRoot.updateOwnProfileUseCase);
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
    );

    await registerAuthRoutes(app, authController, compositionRoot.authorizeRequestUseCase);
    await registerAdminRoutes(app, adminController, compositionRoot.authorizeRequestUseCase);
    await registerAdminUsersRoutes(app, adminUsersController, compositionRoot.authorizeRequestUseCase);
    await registerUsersRoutes(app, usersController, compositionRoot.authorizeRequestUseCase);
    await registerProvidersRoutes(app, providersController, compositionRoot.authorizeRequestUseCase);
    await registerInvoicesRoutes(app, invoicesController, compositionRoot.authorizeRequestUseCase);

    return app;
};
