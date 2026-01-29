import { UserRole } from '../../domain/value-objects/user-role.value-object.js';

export type AccessTokenPayload = {
    userId: string;
    roles: UserRole[];
};

export type RefreshTokenPayload = {
    sessionId: string;
    userId: string;
};

export interface TokenService {
    createAccessToken(payload: AccessTokenPayload): string;
    createRefreshToken(payload: RefreshTokenPayload): string;
}
