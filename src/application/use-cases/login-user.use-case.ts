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
    | AuthRateLimitedError;

export class LoginUserUseCase {
    constructor(private readonly dependencies: LoginUserDependencies) {}

    async execute(request: LoginUserRequest): Promise<Result<LoginUserResponse, LoginUserError>> {
        const now = this.dependencies.dateProvider.now();

        try {
            await this.dependencies.loginRateLimiter.assertAllowed(request.email, request.ip);
        } catch (error) {
            await this.logFailure(request, now);
            if (error instanceof AuthRateLimitedError) {
                return fail(error);
            }
            return fail(new AuthRateLimitedError());
        }

        const user = await this.dependencies.userRepository.findByEmail(request.email);
        if (!user) {
            await this.logFailure(request, now);
            return fail(new AuthInvalidCredentialsError());
        }

        if (!user.isActive()) {
            await this.logFailure(request, now, user.id);
            return fail(new AuthUserDisabledError());
        }

        if (user.isLocked(now)) {
            await this.logFailure(request, now, user.id);
            return fail(new AuthUserLockedError());
        }

        const passwordValid = await this.dependencies.passwordHasher.verify(
            request.password,
            user.passwordHash,
        );

        if (!passwordValid) {
            await this.logFailure(request, now, user.id);
            return fail(new AuthInvalidCredentialsError());
        }

        const sessionId = generateSessionId(now);
        const refreshToken = this.dependencies.tokenService.createRefreshToken({
            sessionId,
            userId: user.id,
        });
        const refreshTokenHash = this.dependencies.refreshTokenHasher.hash(refreshToken);
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

        await this.dependencies.sessionRepository.create(session);

        const accessToken = this.dependencies.tokenService.createAccessToken({
            userId: user.id,
            roles: user.roles,
        });

        await this.dependencies.auditLogger.log({
            action: 'LOGIN_SUCCESS',
            actorUserId: user.id,
            targetUserId: user.id,
            metadata: buildMetadata(request),
            createdAt: now,
        });

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
    ): Promise<void> {
        const event = {
            action: 'LOGIN_FAIL',
            metadata: buildMetadata(request),
            createdAt: now,
            ...(targetUserId ? { actorUserId: targetUserId, targetUserId } : {}),
        };

        await this.dependencies.auditLogger.log(event);
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
