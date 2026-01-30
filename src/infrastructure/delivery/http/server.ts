import path from 'node:path';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { AuthController } from './controllers/auth.controller.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
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

    void registerAuthRoutes(app, authController, compositionRoot.authorizeRequestUseCase);

    return app;
};
