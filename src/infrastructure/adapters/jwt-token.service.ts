import jwt from 'jsonwebtoken';
import { ok, fail, type Result } from '@shared/result.js';
import { PortError } from '@application/errors/port.error.js';
import type { AccessTokenPayload, RefreshTokenPayload, TokenService } from '@application/ports/token.service.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';

type JwtAccessPayload = {
    sub: string;
    roles: string[];
    iat?: number;
    exp?: number;
};

type JwtRefreshPayload = {
    sub: string;
    sessionId: string;
    iat?: number;
    exp?: number;
};

export class JwtTokenService implements TokenService {
    constructor(
        private readonly accessSecret: string,
        private readonly refreshSecret: string,
        private readonly accessTokenTtlSeconds: number,
        private readonly refreshTokenTtlSeconds: number,
    ) {}

    createAccessToken(payload: AccessTokenPayload): Result<string, PortError> {
        try {
            const token = jwt.sign(
                {
                    roles: payload.roles.map((role) => role.getValue()),
                },
                this.accessSecret,
                {
                    subject: payload.userId,
                    expiresIn: this.accessTokenTtlSeconds,
                },
            );
            return ok(token);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('TokenService', 'Failed to create access token', cause));
        }
    }

    createRefreshToken(payload: RefreshTokenPayload): Result<string, PortError> {
        try {
            const token = jwt.sign(
                {
                    sessionId: payload.sessionId,
                },
                this.refreshSecret,
                {
                    subject: payload.userId,
                    expiresIn: this.refreshTokenTtlSeconds,
                },
            );
            return ok(token);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('TokenService', 'Failed to create refresh token', cause));
        }
    }

    verifyAccessToken(token: string): Result<AccessTokenPayload, PortError> {
        try {
            const decoded = jwt.verify(token, this.accessSecret) as JwtAccessPayload;
            const roles = Array.isArray(decoded.roles) ? decoded.roles : [];

            return ok({
                userId: decoded.sub,
                roles: roles.map((role) => (role === 'ADMIN' ? UserRole.admin() : UserRole.user())),
            });
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('TokenService', 'Invalid access token', cause));
        }
    }
}
