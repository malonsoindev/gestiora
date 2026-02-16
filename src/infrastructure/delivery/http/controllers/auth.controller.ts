import type { FastifyReply, FastifyRequest } from 'fastify';
import type { LoginUserUseCase } from '@application/use-cases/login-user.use-case.js';
import type { RefreshAccessTokenUseCase } from '@application/use-cases/refresh-access-token.use-case.js';
import type { LogoutUserUseCase } from '@application/use-cases/logout-user.use-case.js';
import { respondError } from '@infrastructure/delivery/http/errors/respond-error.js';

export type AuthLoginBody = {
    email: string;
    password: string;
};

export type AuthRefreshBody = {
    refreshToken: string;
};

export class AuthController {
    constructor(
        private readonly loginUserUseCase: LoginUserUseCase,
        private readonly refreshAccessTokenUseCase: RefreshAccessTokenUseCase,
        private readonly logoutUserUseCase: LogoutUserUseCase,
    ) {}

    async login(request: FastifyRequest<{ Body: AuthLoginBody }>, reply: FastifyReply) {
        const loginRequest = {
            email: request.body.email,
            password: request.body.password,
            ip: request.ip,
            ...(request.headers['user-agent']
                ? { userAgent: request.headers['user-agent'] }
                : {}),
        };

        const result = await this.loginUserUseCase.execute(loginRequest);

        if (result.success) {
            return reply.code(200).send(result.value);
        }

        return respondError(reply, result.error);
    }

    async refresh(request: FastifyRequest<{ Body: AuthRefreshBody }>, reply: FastifyReply) {
        const result = await this.refreshAccessTokenUseCase.execute({
            refreshToken: request.body.refreshToken,
        });

        if (result.success) {
            return reply.code(200).send(result.value);
        }

        return respondError(reply, result.error);
    }

    async logout(request: FastifyRequest<{ Body: AuthRefreshBody }>, reply: FastifyReply) {
        const result = await this.logoutUserUseCase.execute({
            refreshToken: request.body.refreshToken,
        });

        if (result.success) {
            return reply.code(204).send();
        }

        return respondError(reply, result.error);
    }
}
