import bcrypt from 'bcrypt';
import { InMemoryUserRepository } from '../infrastructure/persistence/in-memory/in-memory-user.repository.js';
import { InMemorySessionRepository } from '../infrastructure/persistence/in-memory/in-memory-session.repository.js';
import { InMemoryLoginAttemptRepository } from '../infrastructure/persistence/in-memory/in-memory-login-attempt.repository.js';
import { InMemoryAuditLogger } from '../infrastructure/adapters/in-memory/in-memory-audit-logger.js';
import { SystemDateProvider } from '../infrastructure/adapters/system-date-provider.js';
import { BcryptPasswordHasher } from '../infrastructure/adapters/bcrypt-password-hasher.js';
import { SimpleRefreshTokenHasher } from '../infrastructure/adapters/simple-refresh-token-hasher.js';
import { JwtTokenService } from '../infrastructure/adapters/jwt-token.service.js';
import { InMemoryLoginRateLimiter } from '../infrastructure/adapters/in-memory/in-memory-login-rate-limiter.js';
import { LoginUserUseCase } from '../application/use-cases/login-user.use-case.js';
import { RefreshAccessTokenUseCase } from '../application/use-cases/refresh-access-token.use-case.js';
import { LogoutUserUseCase } from '../application/use-cases/logout-user.use-case.js';
import { AuthorizeRequestUseCase } from '../application/use-cases/authorize-request.use-case.js';
import { AntiBruteForceUseCase } from '../application/use-cases/anti-brute-force.use-case.js';
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case.js';
import { User, UserStatus } from '../domain/entities/user.entity.js';
import { Email } from '../domain/value-objects/email.value-object.js';
import { UserRole } from '../domain/value-objects/user-role.value-object.js';
import { config } from '../config/env.js';
import { DatabaseFactory } from '../infrastructure/database/database-factory.js';
import { PostgresUserRepository } from '../infrastructure/persistence/postgres/postgres-user.repository.js';
import { PostgresSessionRepository } from '../infrastructure/persistence/postgres/postgres-session.repository.js';
import { PostgresLoginAttemptRepository } from '../infrastructure/persistence/postgres/postgres-login-attempt.repository.js';

const ACCESS_TOKEN_TTL_SECONDS = 900;
const REFRESH_TOKEN_TTL_SECONDS = 2_592_000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_LOCK_MINUTES = 30;

const usePostgres = config.DATABASE_TYPE === 'postgres';
const sqlClient = usePostgres ? DatabaseFactory.createClient() : undefined;
const unitOfWork = usePostgres ? DatabaseFactory.createUnitOfWork() : undefined;

if (usePostgres && sqlClient) {

    const hayConexion = await DatabaseFactory.checkConnection();
    if (hayConexion) {
        console.log('Conexión a la base de datos Postgres establecida correctamente');
    }
    else {
        console.log('No se pudo establecer conexión a la base de datos Postgres');
    }
}

const userRepository = usePostgres && sqlClient
    ? new PostgresUserRepository(sqlClient)
    : new InMemoryUserRepository();
const sessionRepository = usePostgres && sqlClient
    ? new PostgresSessionRepository(sqlClient)
    : new InMemorySessionRepository();
const loginAttemptRepository = usePostgres && sqlClient
    ? new PostgresLoginAttemptRepository(sqlClient)
    : new InMemoryLoginAttemptRepository();
const auditLogger = new InMemoryAuditLogger();
const dateProvider = new SystemDateProvider();
const passwordHasher = new BcryptPasswordHasher();
const refreshTokenHasher = new SimpleRefreshTokenHasher();
const tokenService = new JwtTokenService(
    config.JWT_ACCESS_SECRET,
    config.JWT_REFRESH_SECRET,
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
    rotateRefreshTokens: true,
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

const createUserUseCase = new CreateUserUseCase({
    userRepository,
    passwordHasher,
    auditLogger,
    dateProvider,
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
    unitOfWork,
    loginUserUseCase,
    createUserUseCase,
    refreshAccessTokenUseCase,
    logoutUserUseCase,
    authorizeRequestUseCase,
    antiBruteForceUseCase,
};

export const seedUsers = async (): Promise<void> => {
    if (!(userRepository instanceof InMemoryUserRepository)) {
        return;
    }
    const now = new Date();
    const saltRounds = 12;
    const adminHash = await bcrypt.hash('AdminPass1!a', saltRounds);
    const userHash = await bcrypt.hash('UserPass1!a', saltRounds);

    userRepository.add(
        User.create({
            id: 'admin-1',
            email: Email.create('admin@example.com'),
            passwordHash: adminHash,
            status: UserStatus.Active,
            roles: [UserRole.admin()],
            createdAt: now,
            updatedAt: now,
        }),
    );

    userRepository.add(
        User.create({
            id: 'user-1',
            email: Email.create('user@example.com'),
            passwordHash: userHash,
            status: UserStatus.Active,
            roles: [UserRole.user()],
            createdAt: now,
            updatedAt: now,
        }),
    );
};
