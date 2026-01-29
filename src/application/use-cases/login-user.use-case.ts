import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { LoginRateLimiter } from '../ports/login-rate-limiter.js';
import type { PasswordHasher } from '../ports/password-hasher.js';
import type { RefreshTokenHasher } from '../ports/refresh-token-hasher.js';
import type { SessionRepository } from '../ports/session.repository.js';
import type { TokenService } from '../ports/token.service.js';
import type { UserRepository } from '../ports/user.repository.js';
import type { LoginUserRequest } from '../dto/login-user.request.js';
import type { LoginUserResponse } from '../dto/login-user.response.js';
import { fail, ok, type Result } from '../../shared/result.js';
import type { PortError } from '../errors/port.error.js';
import { Session, SessionStatus } from '../../domain/entities/session.entity.js';
import { AuthInvalidCredentialsError } from '../../domain/errors/auth-invalid-credentials.error.js';
import { AuthRateLimitedError } from '../../domain/errors/auth-rate-limited.error.js';
import { AuthUserDisabledError } from '../../domain/errors/auth-user-disabled.error.js';
import { AuthUserLockedError } from '../../domain/errors/auth-user-locked.error.js';

export type LoginUserDependencies = {
    userRepository: UserRepository;
    sessionRepository: SessionRepository;
    passwordHasher: PasswordHasher;
    tokenService: TokenService;
    refreshTokenHasher: RefreshTokenHasher;
    auditLogger: AuditLogger;
    loginRateLimiter: LoginRateLimiter;
    dateProvider: DateProvider;
    accessTokenTtlSeconds: number;
    refreshTokenTtlSeconds: number;
};

export type LoginUserError =
    | AuthInvalidCredentialsError
    | AuthUserDisabledError
    | AuthUserLockedError
    | AuthRateLimitedError
    | PortError;

export class LoginUserUseCase {
    constructor(private readonly dependencies: LoginUserDependencies) {}

    async execute(request: LoginUserRequest): Promise<Result<LoginUserResponse, LoginUserError>> {
        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }
        const now = nowResult.value;

        const rateLimitResult = await this.dependencies.loginRateLimiter.assertAllowed(
            request.email,
            request.ip,
        );
        if (!rateLimitResult.success) {
            const logResult = await this.logFailure(request, now);
            if (!logResult.success) {
                return fail(logResult.error);
            }
            return fail(rateLimitResult.error);
        }

        const userResult = await this.dependencies.userRepository.findByEmail(request.email);
        if (!userResult.success) {
            return fail(userResult.error);
        }
        const user = userResult.value;
        if (!user) {
            const logResult = await this.logFailure(request, now);
            if (!logResult.success) {
                return fail(logResult.error);
            }
            return fail(new AuthInvalidCredentialsError());
        }

        if (!user.isActive()) {
            const logResult = await this.logFailure(request, now, user.id);
            if (!logResult.success) {
                return fail(logResult.error);
            }
            return fail(new AuthUserDisabledError());
        }

        if (user.isLocked(now)) {
            const logResult = await this.logFailure(request, now, user.id);
            if (!logResult.success) {
                return fail(logResult.error);
            }
            return fail(new AuthUserLockedError());
        }

        const passwordResult = await this.dependencies.passwordHasher.verify(
            request.password,
            user.passwordHash,
        );
        if (!passwordResult.success) {
            return fail(passwordResult.error);
        }
        const passwordValid = passwordResult.value;

        if (!passwordValid) {
            const logResult = await this.logFailure(request, now, user.id);
            if (!logResult.success) {
                return fail(logResult.error);
            }
            return fail(new AuthInvalidCredentialsError());
        }

        const sessionId = generateSessionId(now);
        const refreshTokenResult = this.dependencies.tokenService.createRefreshToken({
            sessionId,
            userId: user.id,
        });
        if (!refreshTokenResult.success) {
            return fail(refreshTokenResult.error);
        }
        const refreshToken = refreshTokenResult.value;

        const refreshTokenHashResult = this.dependencies.refreshTokenHasher.hash(refreshToken);
        if (!refreshTokenHashResult.success) {
            return fail(refreshTokenHashResult.error);
        }
        const refreshTokenHash = refreshTokenHashResult.value;
        const refreshExpiresAt = addSeconds(now, this.dependencies.refreshTokenTtlSeconds);

        const session = Session.create({
            id: sessionId,
            userId: user.id,
            refreshTokenHash,
            status: SessionStatus.Active,
            createdAt: now,
            lastUsedAt: now,
            expiresAt: refreshExpiresAt,
            ...(request.ip ? { ip: request.ip } : {}),
            ...(request.userAgent ? { userAgent: request.userAgent } : {}),
        });

        const sessionResult = await this.dependencies.sessionRepository.create(session);
        if (!sessionResult.success) {
            return fail(sessionResult.error);
        }

        const accessTokenResult = this.dependencies.tokenService.createAccessToken({
            userId: user.id,
            roles: user.roles,
        });
        if (!accessTokenResult.success) {
            return fail(accessTokenResult.error);
        }
        const accessToken = accessTokenResult.value;

        const auditResult = await this.dependencies.auditLogger.log({
            action: 'LOGIN_SUCCESS',
            actorUserId: user.id,
            targetUserId: user.id,
            metadata: buildMetadata(request),
            createdAt: now,
        });
        if (!auditResult.success) {
            return fail(auditResult.error);
        }

        return ok({
            accessToken,
            refreshToken,
            expiresIn: this.dependencies.accessTokenTtlSeconds,
        });
    }

    private async logFailure(
        request: LoginUserRequest,
        now: Date,
        targetUserId?: string,
    ): Promise<Result<void, PortError>> {
        const event = {
            action: 'LOGIN_FAIL',
            metadata: buildMetadata(request),
            createdAt: now,
            ...(targetUserId ? { actorUserId: targetUserId, targetUserId } : {}),
        };

        return this.dependencies.auditLogger.log(event);
    }
}

const addSeconds = (date: Date, seconds: number): Date =>
    new Date(date.getTime() + seconds * 1000);

const generateSessionId = (date: Date): string => {
    const randomPart = Math.floor(Math.random() * 1_000_000_000).toString(36);
    return `session-${date.getTime()}-${randomPart}`;
};

const buildMetadata = (request: LoginUserRequest): Record<string, string> => {
    const metadata: Record<string, string> = {};

    if (request.ip) {
        metadata.ip = request.ip;
    }

    if (request.userAgent) {
        metadata.userAgent = request.userAgent;
    }

    return metadata;
};
