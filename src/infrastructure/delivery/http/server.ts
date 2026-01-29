import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { AuthController } from './controllers/auth.controller.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { compositionRoot } from '../../../composition/index.js';

export const buildServer = (): FastifyInstance => {
    const app = Fastify({ logger: true });

    const authController = new AuthController(
        compositionRoot.loginUserUseCase,
        compositionRoot.refreshAccessTokenUseCase,
        compositionRoot.logoutUserUseCase,
    );

    void registerAuthRoutes(app, authController);

    return app;
};
