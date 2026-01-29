import type { FastifyInstance } from 'fastify';
import type { AuthController, AuthLoginBody, AuthRefreshBody } from '../controllers/auth.controller.js';

export const registerAuthRoutes = async (
    app: FastifyInstance,
    controller: AuthController,
): Promise<void> => {
    app.post<{ Body: AuthLoginBody }>(
        '/auth/login',
        async (request, reply) => controller.login(request, reply),
    );
    app.post<{ Body: AuthRefreshBody }>(
        '/auth/refresh',
        async (request, reply) => controller.refresh(request, reply),
    );
    app.post<{ Body: AuthRefreshBody }>(
        '/auth/logout',
        async (request, reply) => controller.logout(request, reply),
    );
};
