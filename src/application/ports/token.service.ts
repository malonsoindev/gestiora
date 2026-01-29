import { UserRole } from '../../domain/value-objects/user-role.value-object.js';
import type { Result } from '../../shared/result.js';
import type { PortError } from '../errors/port.error.js';

export type AccessTokenPayload = {
    userId: string;
    roles: UserRole[];
};

export type RefreshTokenPayload = {
    sessionId: string;
    userId: string;
};

export interface TokenService {
    createAccessToken(payload: AccessTokenPayload): Result<string, PortError>;
    createRefreshToken(payload: RefreshTokenPayload): Result<string, PortError>;
    verifyAccessToken(token: string): Result<AccessTokenPayload, PortError>;
}
