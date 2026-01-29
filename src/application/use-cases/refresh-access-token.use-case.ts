import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { RefreshTokenHasher } from '../ports/refresh-token-hasher.js';
import type { SessionRepository } from '../ports/session.repository.js';
import type { TokenService } from '../ports/token.service.js';
import type { UserRepository } from '../ports/user.repository.js';
import type { RefreshAccessTokenRequest } from '../dto/refresh-access-token.request.js';
import type { RefreshAccessTokenResponse } from '../dto/refresh-access-token.response.js';
import { Session, SessionStatus } from '../../domain/entities/session.entity.js';
import { AuthInvalidRefreshTokenError } from '../../domain/errors/auth-invalid-refresh-token.error.js';
import { fail, ok, type Result } from '../../shared/result.js';
import type { PortError } from '../errors/port.error.js';

export type RefreshAccessTokenDependencies = {
    sessionRepository: SessionRepository;
    userRepository: UserRepository;
    tokenService: TokenService;
    refreshTokenHasher: RefreshTokenHasher;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
    accessTokenTtlSeconds: number;
    refreshTokenTtlSeconds: number;
    rotateRefreshTokens: boolean;
};

export class RefreshAccessTokenUseCase {
    constructor(private readonly dependencies: RefreshAccessTokenDependencies) {}

    async execute(
        request: RefreshAccessTokenRequest,
    ): Promise<Result<RefreshAccessTokenResponse, AuthInvalidRefreshTokenError | PortError>> {
        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }
        const now = nowResult.value;

        const refreshTokenHashResult = this.dependencies.refreshTokenHasher.hash(
            request.refreshToken,
        );
        if (!refreshTokenHashResult.success) {
            return fail(refreshTokenHashResult.error);
        }
        const refreshTokenHash = refreshTokenHashResult.value;

        const sessionResult = await this.dependencies.sessionRepository.findByRefreshTokenHash(
            refreshTokenHash,
        );
        if (!sessionResult.success) {
            return fail(sessionResult.error);
        }
        const session = sessionResult.value;
        if (!session || !this.isSessionValid(session, now)) {
            const logResult = await this.logFailure(now);
            if (!logResult.success) {
                return fail(logResult.error);
            }
            return fail(new AuthInvalidRefreshTokenError());
        }

        const userResult = await this.dependencies.userRepository.findById(session.userId);
        if (!userResult.success) {
            return fail(userResult.error);
        }
        const user = userResult.value;
        if (!user) {
            const logResult = await this.logFailure(now);
            if (!logResult.success) {
                return fail(logResult.error);
            }
            return fail(new AuthInvalidRefreshTokenError());
        }

        const accessTokenResult = this.dependencies.tokenService.createAccessToken({
            userId: user.id,
            roles: user.roles,
        });
        if (!accessTokenResult.success) {
            return fail(accessTokenResult.error);
        }
        const accessToken = accessTokenResult.value;

        const result: RefreshAccessTokenResponse = {
            accessToken,
            expiresIn: this.dependencies.accessTokenTtlSeconds,
        };

        if (this.dependencies.rotateRefreshTokens) {
            const newRefreshTokenResult = this.dependencies.tokenService.createRefreshToken({
                sessionId: session.id,
                userId: session.userId,
            });
            if (!newRefreshTokenResult.success) {
                return fail(newRefreshTokenResult.error);
            }
            const newRefreshToken = newRefreshTokenResult.value;

            const newRefreshHashResult = this.dependencies.refreshTokenHasher.hash(
                newRefreshToken,
            );
            if (!newRefreshHashResult.success) {
                return fail(newRefreshHashResult.error);
            }
            const newRefreshHash = newRefreshHashResult.value;
            const updatedSession = updateSessionRefresh(
                session,
                newRefreshHash,
                now,
                this.dependencies.refreshTokenTtlSeconds,
            );

            const updateResult = await this.dependencies.sessionRepository.update(updatedSession);
            if (!updateResult.success) {
                return fail(updateResult.error);
            }
            result.refreshToken = newRefreshToken;
        }

        const auditResult = await this.dependencies.auditLogger.log({
            action: 'REFRESH_SUCCESS',
            actorUserId: user.id,
            targetUserId: user.id,
            metadata: {},
            createdAt: now,
        });
        if (!auditResult.success) {
            return fail(auditResult.error);
        }

        return ok(result);
    }

    private isSessionValid(session: Session, now: Date): boolean {
        if (session.status !== SessionStatus.Active) {
            return false;
        }

        return session.expiresAt.getTime() > now.getTime();
    }

    private async logFailure(now: Date): Promise<Result<void, PortError>> {
        return this.dependencies.auditLogger.log({
            action: 'REFRESH_FAIL',
            metadata: {},
            createdAt: now,
        });
    }
}

const updateSessionRefresh = (
    session: Session,
    refreshTokenHash: string,
    now: Date,
    refreshTtlSeconds: number,
): Session => {
    return Session.create({
        id: session.id,
        userId: session.userId,
        refreshTokenHash,
        status: session.status,
        createdAt: session.createdAt,
        lastUsedAt: now,
        expiresAt: addSeconds(now, refreshTtlSeconds),
        ...(session.revokedAt ? { revokedAt: session.revokedAt } : {}),
        ...(session.revokedBy ? { revokedBy: session.revokedBy } : {}),
        ...(session.ip ? { ip: session.ip } : {}),
        ...(session.userAgent ? { userAgent: session.userAgent } : {}),
    });
};

const addSeconds = (date: Date, seconds: number): Date =>
    new Date(date.getTime() + seconds * 1000);
