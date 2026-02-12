import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { RefreshTokenHasher } from '@application/ports/refresh-token-hasher.js';
import type { SessionRepository } from '@application/ports/session.repository.js';
import type { LogoutUserRequest } from '@application/dto/logout-user.request.js';
import type { LogoutUserResponse } from '@application/dto/logout-user.response.js';
import type { PortError } from '@application/errors/port.error.js';
import { Session, SessionStatus } from '@domain/entities/session.entity.js';
import { fail, ok, type Result } from '@shared/result.js';

export type LogoutUserDependencies = {
    sessionRepository: SessionRepository;
    refreshTokenHasher: RefreshTokenHasher;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
};

export class LogoutUserUseCase {
    constructor(private readonly dependencies: LogoutUserDependencies) {}

    async execute(
        request: LogoutUserRequest,
    ): Promise<Result<LogoutUserResponse, PortError>> {
        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }
        const now = nowResult.value;

        const refreshHashResult = this.dependencies.refreshTokenHasher.hash(request.refreshToken);
        if (!refreshHashResult.success) {
            return fail(refreshHashResult.error);
        }

        const sessionResult = await this.dependencies.sessionRepository.findByRefreshTokenHash(
            refreshHashResult.value,
        );
        if (!sessionResult.success) {
            return fail(sessionResult.error);
        }

        const session = sessionResult.value;
        if (session?.status === SessionStatus.Active) {
            const revokedSession = this.revokeSession(session, now);
            const updateResult = await this.dependencies.sessionRepository.update(revokedSession);
            if (!updateResult.success) {
                return fail(updateResult.error);
            }
        }

        const auditEvent = {
            action: 'LOGOUT',
            metadata: {},
            createdAt: now,
            ...(session?.userId ? { actorUserId: session.userId, targetUserId: session.userId } : {}),
        };
        const auditResult = await this.dependencies.auditLogger.log(auditEvent);
        if (!auditResult.success) {
            return fail(auditResult.error);
        }

        return ok({});
    }

    private revokeSession(session: Session, now: Date): Session {
        return Session.create({
            id: session.id,
            userId: session.userId,
            refreshTokenHash: session.refreshTokenHash,
            status: SessionStatus.Revoked,
            createdAt: session.createdAt,
            lastUsedAt: now,
            expiresAt: session.expiresAt,
            revokedAt: now,
            revokedBy: session.userId,
            ...(session.ip ? { ip: session.ip } : {}),
            ...(session.userAgent ? { userAgent: session.userAgent } : {}),
        });
    }
}
