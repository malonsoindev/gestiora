import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { LoginRateLimiter } from '@application/ports/login-rate-limiter.js';
import type { LoginAttemptRepository } from '@application/ports/login-attempt.repository.js';
import type { PasswordHasher } from '@application/ports/password-hasher.js';
import type { RefreshTokenHasher } from '@application/ports/refresh-token-hasher.js';
import type { IdGenerator } from '@application/ports/id-generator.js';
import type { SessionRepository } from '@application/ports/session.repository.js';
import type { TokenService } from '@application/ports/token.service.js';
import type { UserRepository } from '@application/ports/user.repository.js';
import type { LoginUserRequest } from '@application/dto/login-user.request.js';
import type { LoginUserResponse } from '@application/dto/login-user.response.js';
import { fail, ok, type Result } from '@shared/result.js';
import { addSeconds } from '@shared/date-utils.js';
import type { PortError } from '@application/errors/port.error.js';
import { Session, SessionStatus } from '@domain/entities/session.entity.js';
import type { User } from '@domain/entities/user.entity.js';
import { AuthInvalidCredentialsError } from '@domain/errors/auth-invalid-credentials.error.js';
import { AuthRateLimitedError } from '@domain/errors/auth-rate-limited.error.js';
import { AuthUserDisabledError } from '@domain/errors/auth-user-disabled.error.js';
import { AuthUserLockedError } from '@domain/errors/auth-user-locked.error.js';

export type LoginUserDependencies = {
    userRepository: UserRepository;
    sessionRepository: SessionRepository;
    passwordHasher: PasswordHasher;
    tokenService: TokenService;
    refreshTokenHasher: RefreshTokenHasher;
    sessionIdGenerator: IdGenerator;
    auditLogger: AuditLogger;
    loginRateLimiter: LoginRateLimiter;
    loginAttemptRepository: LoginAttemptRepository;
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
        const nowResult = this.getNow();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }
        const now = nowResult.value;

        const rateLimitResult = await this.assertRateLimit(request, now);
        if (!rateLimitResult.success) {
            return fail(rateLimitResult.error);
        }

        const userResult = await this.loadUser(request, now);
        if (!userResult.success) {
            return fail(userResult.error);
        }
        const user = userResult.value;

        const statusResult = await this.assertUserStatus(user, request, now);
        if (!statusResult.success) {
            return fail(statusResult.error);
        }

        const passwordResult = await this.assertPasswordValid(user, request, now);
        if (!passwordResult.success) {
            return fail(passwordResult.error);
        }

        const sessionResult = await this.createSession(user, request, now);
        if (!sessionResult.success) {
            return fail(sessionResult.error);
        }
        const { refreshToken } = sessionResult.value;

        const accessTokenResult = this.createAccessToken(user);
        if (!accessTokenResult.success) {
            return fail(accessTokenResult.error);
        }
        const accessToken = accessTokenResult.value;

        const auditResult = await this.logSuccess(user.id, request, now);
        if (!auditResult.success) {
            return fail(auditResult.error);
        }

        return ok({
            accessToken,
            refreshToken,
            expiresIn: this.dependencies.accessTokenTtlSeconds,
        });
    }

    private getNow(): Result<Date, PortError> {
        return this.dependencies.dateProvider.now();
    }

    private async assertRateLimit(
        request: LoginUserRequest,
        now: Date,
    ): Promise<Result<void, AuthRateLimitedError | PortError>> {
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
        return ok(undefined);
    }

    private async loadUser(
        request: LoginUserRequest,
        now: Date,
    ): Promise<Result<User, LoginUserError>> {
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
        return ok(user);
    }

    private async assertUserStatus(
        user: User,
        request: LoginUserRequest,
        now: Date,
    ): Promise<Result<void, AuthUserDisabledError | AuthUserLockedError | PortError>> {
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

        return ok(undefined);
    }

    private async assertPasswordValid(
        user: User,
        request: LoginUserRequest,
        now: Date,
    ): Promise<Result<void, AuthInvalidCredentialsError | PortError>> {
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

        return ok(undefined);
    }

    private async createSession(
        user: User,
        request: LoginUserRequest,
        now: Date,
    ): Promise<Result<{ sessionId: string; refreshToken: string }, PortError>> {
        const sessionId = this.dependencies.sessionIdGenerator.generate();
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

        return ok({ sessionId, refreshToken });
    }

    private createAccessToken(
        user: User,
    ): Result<string, PortError> {
        const accessTokenResult = this.dependencies.tokenService.createAccessToken({
            userId: user.id,
            roles: user.roles,
        });
        if (!accessTokenResult.success) {
            return fail(accessTokenResult.error);
        }
        return ok(accessTokenResult.value);
    }

    private async logSuccess(
        userId: string,
        request: LoginUserRequest,
        now: Date,
    ): Promise<Result<void, PortError>> {
        const recordResult = await this.dependencies.loginAttemptRepository.recordAttempt(
            {
                email: request.email,
                ...(request.ip ? { ip: request.ip } : {}),
            },
            true,
            now,
        );
        if (!recordResult.success) {
            return fail(recordResult.error);
        }

        return this.dependencies.auditLogger.log({
            action: 'LOGIN_SUCCESS',
            actorUserId: userId,
            targetUserId: userId,
            metadata: buildMetadata(request),
            createdAt: now,
        });
    }

    private async logFailure(
        request: LoginUserRequest,
        now: Date,
        targetUserId?: string,
    ): Promise<Result<void, PortError>> {
        const recordResult = await this.dependencies.loginAttemptRepository.recordAttempt(
            {
                email: request.email,
                ...(request.ip ? { ip: request.ip } : {}),
            },
            false,
            now,
        );
        if (!recordResult.success) {
            return fail(recordResult.error);
        }

        const event = {
            action: 'LOGIN_FAIL',
            metadata: buildMetadata(request),
            createdAt: now,
            ...(targetUserId ? { actorUserId: targetUserId, targetUserId } : {}),
        };

        return this.dependencies.auditLogger.log(event);
    }
}

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
