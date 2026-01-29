import { InMemoryUserRepository } from '../infrastructure/persistence/in-memory-user.repository.js';
import { InMemorySessionRepository } from '../infrastructure/persistence/in-memory-session.repository.js';
import { InMemoryLoginAttemptRepository } from '../infrastructure/persistence/in-memory-login-attempt.repository.js';
import { InMemoryAuditLogger } from '../infrastructure/adapters/in-memory-audit-logger.js';
import { SystemDateProvider } from '../infrastructure/adapters/system-date-provider.js';
import { PlainTextPasswordHasher } from '../infrastructure/adapters/plain-text-password-hasher.js';
import { SimpleRefreshTokenHasher } from '../infrastructure/adapters/simple-refresh-token-hasher.js';
import { InMemoryTokenService } from '../infrastructure/adapters/in-memory-token.service.js';
import { InMemoryLoginRateLimiter } from '../infrastructure/adapters/in-memory-login-rate-limiter.js';
import { LoginUserUseCase } from '../application/use-cases/login-user.use-case.js';
import { RefreshAccessTokenUseCase } from '../application/use-cases/refresh-access-token.use-case.js';
import { LogoutUserUseCase } from '../application/use-cases/logout-user.use-case.js';
import { AuthorizeRequestUseCase } from '../application/use-cases/authorize-request.use-case.js';
import { AntiBruteForceUseCase } from '../application/use-cases/anti-brute-force.use-case.js';
import { User, UserStatus } from '../domain/entities/user.entity.js';
import { UserRole } from '../domain/value-objects/user-role.value-object.js';

const ACCESS_TOKEN_TTL_SECONDS = 900;
const REFRESH_TOKEN_TTL_SECONDS = 2_592_000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_LOCK_MINUTES = 30;

const userRepository = new InMemoryUserRepository();
const sessionRepository = new InMemorySessionRepository();
const loginAttemptRepository = new InMemoryLoginAttemptRepository();
const auditLogger = new InMemoryAuditLogger();
const dateProvider = new SystemDateProvider();
const passwordHasher = new PlainTextPasswordHasher();
const refreshTokenHasher = new SimpleRefreshTokenHasher();
const tokenService = new InMemoryTokenService(
    ACCESS_TOKEN_TTL_SECONDS,
    REFRESH_TOKEN_TTL_SECONDS,
);
const loginRateLimiter = new InMemoryLoginRateLimiter(
    loginAttemptRepository,
    MAX_LOGIN_ATTEMPTS,
    LOGIN_WINDOW_MINUTES,
);

const loginUserUseCase = new LoginUserUseCase({
    userRepository,
    sessionRepository,
    passwordHasher,
    tokenService,
    refreshTokenHasher,
    auditLogger,
    loginRateLimiter,
    dateProvider,
    accessTokenTtlSeconds: ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlSeconds: REFRESH_TOKEN_TTL_SECONDS,
});

const refreshAccessTokenUseCase = new RefreshAccessTokenUseCase({
    sessionRepository,
    userRepository,
    tokenService,
    refreshTokenHasher,
    auditLogger,
    dateProvider,
    accessTokenTtlSeconds: ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlSeconds: REFRESH_TOKEN_TTL_SECONDS,
    rotateRefreshTokens: false,
});

const logoutUserUseCase = new LogoutUserUseCase({
    sessionRepository,
    refreshTokenHasher,
    auditLogger,
    dateProvider,
});

const authorizeRequestUseCase = new AuthorizeRequestUseCase({
    tokenService,
    auditLogger,
    dateProvider,
});

const antiBruteForceUseCase = new AntiBruteForceUseCase({
    loginAttemptRepository,
    auditLogger,
    dateProvider,
    maxAttempts: MAX_LOGIN_ATTEMPTS,
    windowMinutes: LOGIN_WINDOW_MINUTES,
    lockMinutes: LOGIN_LOCK_MINUTES,
});

export const compositionRoot = {
    userRepository,
    sessionRepository,
    loginAttemptRepository,
    auditLogger,
    dateProvider,
    passwordHasher,
    refreshTokenHasher,
    tokenService,
    loginRateLimiter,
    loginUserUseCase,
    refreshAccessTokenUseCase,
    logoutUserUseCase,
    authorizeRequestUseCase,
    antiBruteForceUseCase,
};

export const seedUsers = (): void => {
    const now = new Date();

    userRepository.add(
        User.create({
            id: 'admin-1',
            email: 'admin@example.com',
            passwordHash: 'AdminPass1!a',
            status: UserStatus.Active,
            roles: [UserRole.admin()],
            createdAt: now,
            updatedAt: now,
        }),
    );

    userRepository.add(
        User.create({
            id: 'user-1',
            email: 'user@example.com',
            passwordHash: 'UserPass1!a',
            status: UserStatus.Active,
            roles: [UserRole.user()],
            createdAt: now,
            updatedAt: now,
        }),
    );
};
