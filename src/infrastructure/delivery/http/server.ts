import path from 'node:path';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { AuthController } from './controllers/auth.controller.js';
import { AdminController } from './controllers/admin.controller.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerAdminRoutes } from './routes/admin.routes.js';
import { compositionRoot } from '../../../composition/index.js';
import { config, isDevelopment, isProduction } from '../../../config/env.js';

export const buildServer = (): FastifyInstance => {
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
            void app.register(fastifyCors, { origin: corsOrigin });
        }
    }

    // Añadimos un error handler personalizado para manejar errores de validación y otros errores generales
    // y devolver respuestas JSON consistentes.
    const isObject = (value: unknown): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null;

    app.setErrorHandler((error, _request, reply) => {
        const statusCode = isObject(error) && typeof error.statusCode === 'number' ? error.statusCode : 500;
        const message = isObject(error) && typeof error.message === 'string' ? error.message : 'Internal error';

        if (statusCode === 400 && isObject(error) && 'validation' in error) {
            void reply.code(400).send({ error: 'VALIDATION_ERROR', message });
            return;
        }

        void reply.code(statusCode).send({ error: 'INTERNAL_ERROR' });
    });

    void app.register(fastifyStatic, {
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

    void registerAuthRoutes(app, authController, compositionRoot.authorizeRequestUseCase);
    void registerAdminRoutes(app, adminController, compositionRoot.authorizeRequestUseCase);

    return app;
};
