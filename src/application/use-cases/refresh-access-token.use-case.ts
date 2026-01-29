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
    ): Promise<Result<RefreshAccessTokenResponse, AuthInvalidRefreshTokenError>> {
        const now = this.dependencies.dateProvider.now();
        const refreshTokenHash = this.dependencies.refreshTokenHasher.hash(request.refreshToken);

        const session = await this.dependencies.sessionRepository.findByRefreshTokenHash(
            refreshTokenHash,
        );

        if (!session || !this.isSessionValid(session, now)) {
            await this.logFailure(now);
            return fail(new AuthInvalidRefreshTokenError());
        }

        const user = await this.dependencies.userRepository.findById(session.userId);
        if (!user) {
            await this.logFailure(now);
            return fail(new AuthInvalidRefreshTokenError());
        }

        const accessToken = this.dependencies.tokenService.createAccessToken({
            userId: user.id,
            roles: user.roles,
        });

        const result: RefreshAccessTokenResponse = {
            accessToken,
            expiresIn: this.dependencies.accessTokenTtlSeconds,
        };

        if (this.dependencies.rotateRefreshTokens) {
            const newRefreshToken = this.dependencies.tokenService.createRefreshToken({
                sessionId: session.id,
                userId: session.userId,
            });
            const newRefreshHash = this.dependencies.refreshTokenHasher.hash(newRefreshToken);
            const updatedSession = updateSessionRefresh(
                session,
                newRefreshHash,
                now,
                this.dependencies.refreshTokenTtlSeconds,
            );

            await this.dependencies.sessionRepository.update(updatedSession);
            result.refreshToken = newRefreshToken;
        }

        await this.dependencies.auditLogger.log({
            action: 'REFRESH_SUCCESS',
            actorUserId: user.id,
            targetUserId: user.id,
            metadata: {},
            createdAt: now,
        });

        return ok(result);
    }

    private isSessionValid(session: Session, now: Date): boolean {
        if (session.status !== SessionStatus.Active) {
            return false;
        }

        return session.expiresAt.getTime() > now.getTime();
    }

    private async logFailure(now: Date): Promise<void> {
        await this.dependencies.auditLogger.log({
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
