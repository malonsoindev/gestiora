import type {
    TokenService,
    AccessTokenPayload,
    RefreshTokenPayload,
} from '@application/ports/token.service.js';
import { PortError } from '@application/errors/port.error.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { fail, ok, type Result } from '@shared/result.js';

export type TokenServiceStubOptions = {
    /**
     * Tokens that should fail verification.
     * When `verifyAccessToken` is called with one of these tokens, it returns a PortError.
     */
    invalidTokens?: string[];

    /**
     * The payload to return on successful verification.
     * Defaults to { userId: 'user-1', roles: [UserRole.user()] }
     */
    verifyPayload?: AccessTokenPayload;

    /**
     * Whether to use incremental refresh tokens (refresh-token-1, refresh-token-2, etc.)
     * Useful for testing token rotation.
     */
    incrementalRefreshTokens?: boolean;
};

/**
 * Stub for TokenService port.
 *
 * Captures all created token payloads for verification in tests.
 *
 * @example
 * // Default behavior - all tokens valid
 * new TokenServiceStub()
 *
 * @example
 * // Token 'invalid' fails verification
 * new TokenServiceStub({ invalidTokens: ['invalid'] })
 *
 * @example
 * // Custom verify payload
 * new TokenServiceStub({ verifyPayload: { userId: 'admin-1', roles: [UserRole.admin()] } })
 *
 * @example
 * // Incremental refresh tokens for rotation tests
 * new TokenServiceStub({ incrementalRefreshTokens: true })
 */
export class TokenServiceStub implements TokenService {
    accessPayloads: AccessTokenPayload[] = [];
    refreshPayloads: RefreshTokenPayload[] = [];

    private refreshCount = 0;
    private readonly invalidTokens: string[];
    private readonly verifyPayload: AccessTokenPayload;
    private readonly incrementalRefreshTokens: boolean;

    constructor(options: TokenServiceStubOptions = {}) {
        this.invalidTokens = options.invalidTokens ?? [];
        this.verifyPayload = options.verifyPayload ?? {
            userId: 'user-1',
            roles: [UserRole.user()],
        };
        this.incrementalRefreshTokens = options.incrementalRefreshTokens ?? false;
    }

    createAccessToken(payload: AccessTokenPayload): Result<string, PortError> {
        this.accessPayloads.push(payload);
        return ok('access-token');
    }

    createRefreshToken(payload: RefreshTokenPayload): Result<string, PortError> {
        this.refreshPayloads.push(payload);
        this.refreshCount += 1;

        if (this.incrementalRefreshTokens) {
            return ok(`refresh-token-${this.refreshCount}`);
        }

        return ok('refresh-token');
    }

    verifyAccessToken(token: string): Result<AccessTokenPayload, PortError> {
        if (this.invalidTokens.includes(token)) {
            return fail(new PortError('TokenService', 'invalid'));
        }

        return ok(this.verifyPayload);
    }
}
