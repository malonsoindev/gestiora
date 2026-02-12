import { randomUUID } from 'node:crypto';
import { ok, fail, type Result } from '@shared/result.js';
import { PortError } from '@application/errors/port.error.js';
import type {
    AccessTokenPayload,
    RefreshTokenPayload,
    TokenService,
} from '@application/ports/token.service.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';

type StoredAccessToken = {
    token: string;
    payload: AccessTokenPayload;
    expiresAt: Date;
};

type StoredRefreshToken = {
    token: string;
    payload: RefreshTokenPayload;
    expiresAt: Date;
};

export class InMemoryTokenService implements TokenService {
    private readonly accessTokens = new Map<string, StoredAccessToken>();
    private readonly refreshTokens = new Map<string, StoredRefreshToken>();

    constructor(
        private readonly accessTokenTtlSeconds: number,
        private readonly refreshTokenTtlSeconds: number,
    ) {}

    createAccessToken(payload: AccessTokenPayload): Result<string, PortError> {
        const token = this.createToken('access');
        const expiresAt = new Date(Date.now() + this.accessTokenTtlSeconds * 1000);
        this.accessTokens.set(token, { token, payload, expiresAt });
        return ok(token);
    }

    createRefreshToken(payload: RefreshTokenPayload): Result<string, PortError> {
        const token = this.createToken('refresh');
        const expiresAt = new Date(Date.now() + this.refreshTokenTtlSeconds * 1000);
        this.refreshTokens.set(token, { token, payload, expiresAt });
        return ok(token);
    }

    verifyAccessToken(token: string): Result<AccessTokenPayload, PortError> {
        const stored = this.accessTokens.get(token);
        if (!stored) {
            return fail(new PortError('TokenService', 'Access token not found'));
        }

        if (stored.expiresAt.getTime() <= Date.now()) {
            return fail(new PortError('TokenService', 'Access token expired'));
        }

        return ok({
            userId: stored.payload.userId,
            roles: stored.payload.roles.map((role) =>
                role.getValue() === 'ADMIN' ? UserRole.admin() : UserRole.user(),
            ),
        });
    }

    private createToken(prefix: string): string {
        // Use CSPRNG to avoid predictable in-memory tokens.
        return `${prefix}-${randomUUID()}`;
    }
}
