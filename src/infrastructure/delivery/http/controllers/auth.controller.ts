import type { FastifyReply, FastifyRequest } from 'fastify';
import type { LoginUserUseCase } from '@application/use-cases/login-user.use-case.js';
import type { RefreshAccessTokenUseCase } from '@application/use-cases/refresh-access-token.use-case.js';
import type { LogoutUserUseCase } from '@application/use-cases/logout-user.use-case.js';
import { AuthInvalidCredentialsError } from '@domain/errors/auth-invalid-credentials.error.js';
import { AuthUserDisabledError } from '@domain/errors/auth-user-disabled.error.js';
import { AuthUserLockedError } from '@domain/errors/auth-user-locked.error.js';
import { AuthRateLimitedError } from '@domain/errors/auth-rate-limited.error.js';
import { AuthInvalidRefreshTokenError } from '@domain/errors/auth-invalid-refresh-token.error.js';
import { PortError } from '@application/errors/port.error.js';
import { sendInternalError } from '@infrastructure/delivery/http/errors/internal-error-response.js';

type LoginBody = {
    email: string;
    password: string;
};

type RefreshBody = {
    refreshToken: string;
};

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

        if (result.error instanceof AuthRateLimitedError) {
            return reply.code(429).send({ error: 'RATE_LIMITED' });
        }

        if (
            result.error instanceof AuthInvalidCredentialsError ||
            result.error instanceof AuthUserDisabledError ||
            result.error instanceof AuthUserLockedError
        ) {
            return reply.code(401).send({ error: 'AUTH_INVALID_CREDENTIALS' });
        }

        if (result.error instanceof PortError) {
            return sendInternalError(reply);
        }

        return sendInternalError(reply);
    }

    async refresh(request: FastifyRequest<{ Body: AuthRefreshBody }>, reply: FastifyReply) {
        const result = await this.refreshAccessTokenUseCase.execute({
            refreshToken: request.body.refreshToken,
        });

        if (result.success) {
            return reply.code(200).send(result.value);
        }

        if (result.error instanceof AuthInvalidRefreshTokenError) {
            return reply.code(401).send({ error: 'AUTH_INVALID_REFRESH' });
        }

        if (result.error instanceof PortError) {
            return sendInternalError(reply);
        }

        return sendInternalError(reply);
    }

    async logout(request: FastifyRequest<{ Body: AuthRefreshBody }>, reply: FastifyReply) {
        const result = await this.logoutUserUseCase.execute({
            refreshToken: request.body.refreshToken,
        });

        if (result.success) {
            return reply.code(204).send();
        }

        if (result.error instanceof PortError) {
            return sendInternalError(reply);
        }

        return sendInternalError(reply);
    }
}
