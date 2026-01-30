import path from 'node:path';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { AuthController } from './controllers/auth.controller.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { compositionRoot } from '../../../composition/index.js';

export const buildServer = (): FastifyInstance => {
    const app = Fastify({ logger: true });

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
