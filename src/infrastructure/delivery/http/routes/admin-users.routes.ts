import type { FastifyInstance } from 'fastify';
import type { AuthorizeRequestUseCase } from '../../../../application/use-cases/authorize-request.use-case.js';
import type {
    AdminUsersController,
    AdminCreateUserBody,
    AdminUpdateUserBody,
} from '../controllers/admin-users.controller.js';
import { buildAuthorizeMiddleware } from '../middlewares/authorize.middleware.js';
import { adminUsersSchemas } from '../schemas/admin-users.schemas.js';

export const registerAdminUsersRoutes = async (
    app: FastifyInstance,
    controller: AdminUsersController,
    authorizeRequestUseCase: AuthorizeRequestUseCase,
): Promise<void> => {
    app.post<{ Body: AdminCreateUserBody }>(
        '/admin/users',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, true),
            schema: adminUsersSchemas.create,
        },
        async (request, reply) => controller.createUser(request, reply),
    );

    app.get<{
        Querystring: {
            status?: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
            role?: 'Usuario' | 'Administrador';
            page?: number;
            pageSize?: number;
        };
    }>(
        '/admin/users',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, true),
            schema: adminUsersSchemas.list,
        },
        async (request, reply) => controller.listUsers(request, reply),
    );

    app.get<{ Params: { userId: string } }>(
        '/admin/users/:userId',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, true),
            schema: adminUsersSchemas.detail,
        },
        async (request, reply) => controller.getUserDetail(request, reply),
    );

    app.put<{ Params: { userId: string }; Body: AdminUpdateUserBody }>(
        '/admin/users/:userId',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, true),
            schema: adminUsersSchemas.update,
        },
        async (request, reply) => controller.updateUser(request, reply),
    );
};
