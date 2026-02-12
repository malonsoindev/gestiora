import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { RefreshTokenHasher } from '@application/ports/refresh-token-hasher.js';
import type { SessionRepository } from '@application/ports/session.repository.js';
import type { TokenService } from '@application/ports/token.service.js';
import type { UserRepository } from '@application/ports/user.repository.js';
import type { RefreshAccessTokenRequest } from '@application/dto/refresh-access-token.request.js';
import type { RefreshAccessTokenResponse } from '@application/dto/refresh-access-token.response.js';
import { Session, SessionStatus } from '@domain/entities/session.entity.js';
import type { User } from '@domain/entities/user.entity.js';
import { AuthInvalidRefreshTokenError } from '@domain/errors/auth-invalid-refresh-token.error.js';
import { fail, ok, type Result } from '@shared/result.js';
import type { PortError } from '@application/errors/port.error.js';

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
        const nowResult = this.getNow();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }
        const now = nowResult.value;

        const sessionResult = await this.loadSessionByRefreshToken(request, now);
        if (!sessionResult.success) {
            return fail(sessionResult.error);
        }
        const session = sessionResult.value;

        const userResult = await this.loadUserFromSession(session, now);
        if (!userResult.success) {
            return fail(userResult.error);
        }
        const user = userResult.value;

        const accessTokenResult = this.createAccessToken(user);
        if (!accessTokenResult.success) {
            return fail(accessTokenResult.error);
        }
        const accessToken = accessTokenResult.value;

        const result: RefreshAccessTokenResponse = {
            accessToken,
            expiresIn: this.dependencies.accessTokenTtlSeconds,
        };

        const rotateResult = await this.rotateRefreshTokenIfNeeded(session, now);
        if (!rotateResult.success) {
            return fail(rotateResult.error);
        }
        if (rotateResult.value) {
            result.refreshToken = rotateResult.value;
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

    private getNow(): Result<Date, PortError> {
        return this.dependencies.dateProvider.now();
    }

    private async loadSessionByRefreshToken(
        request: RefreshAccessTokenRequest,
        now: Date,
    ): Promise<Result<Session, AuthInvalidRefreshTokenError | PortError>> {
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

        return ok(session);
    }

    private async loadUserFromSession(
        session: Session,
        now: Date,
    ): Promise<Result<User, AuthInvalidRefreshTokenError | PortError>> {
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

        return ok(user);
    }

    private createAccessToken(user: User): Result<string, PortError> {
        const accessTokenResult = this.dependencies.tokenService.createAccessToken({
            userId: user.id,
            roles: user.roles,
        });
        if (!accessTokenResult.success) {
            return fail(accessTokenResult.error);
        }
        return ok(accessTokenResult.value);
    }

    private async rotateRefreshTokenIfNeeded(
        session: Session,
        now: Date,
    ): Promise<Result<string | null, PortError>> {
        if (!this.dependencies.rotateRefreshTokens) {
            return ok(null);
        }

        const newRefreshTokenResult = this.dependencies.tokenService.createRefreshToken({
            sessionId: session.id,
            userId: session.userId,
        });
        if (!newRefreshTokenResult.success) {
            return fail(newRefreshTokenResult.error);
        }
        const newRefreshToken = newRefreshTokenResult.value;

        const newRefreshHashResult = this.dependencies.refreshTokenHasher.hash(newRefreshToken);
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
        return ok(newRefreshToken);
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
