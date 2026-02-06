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
import { TimestampProviderIdGenerator } from '../infrastructure/adapters/timestamp-provider-id-generator.js';
import { TimestampUserIdGenerator } from '../infrastructure/adapters/timestamp-user-id-generator.js';
import { TimestampSessionIdGenerator } from '../infrastructure/adapters/timestamp-session-id-generator.js';
import { TimestampInvoiceIdGenerator } from '../infrastructure/adapters/timestamp-invoice-id-generator.js';
import { TimestampInvoiceMovementIdGenerator } from '../infrastructure/adapters/timestamp-invoice-movement-id-generator.js';
import { LoginUserUseCase } from '../application/use-cases/login-user.use-case.js';
import { RefreshAccessTokenUseCase } from '../application/use-cases/refresh-access-token.use-case.js';
import { LogoutUserUseCase } from '../application/use-cases/logout-user.use-case.js';
import { AuthorizeRequestUseCase } from '../application/use-cases/authorize-request.use-case.js';
import { AntiBruteForceUseCase } from '../application/use-cases/anti-brute-force.use-case.js';
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case.js';
import { GetUserDetailUseCase } from '../application/use-cases/get-user-detail.use-case.js';
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case.js';
import { UpdateUserStatusUseCase } from '../application/use-cases/update-user-status.use-case.js';
import { SoftDeleteUserUseCase } from '../application/use-cases/soft-delete-user.use-case.js';
import { UpdateOwnProfileUseCase } from '../application/use-cases/update-own-profile.use-case.js';
import { RevokeUserSessionsUseCase } from '../application/use-cases/revoke-user-sessions.use-case.js';
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case.js';
import { ListProvidersUseCase } from '../application/use-cases/list-providers.use-case.js';
import { GetProviderDetailUseCase } from '../application/use-cases/get-provider-detail.use-case.js';
import { UpdateProviderUseCase } from '../application/use-cases/update-provider.use-case.js';
import { UpdateProviderStatusUseCase } from '../application/use-cases/update-provider-status.use-case.js';
import { SoftDeleteProviderUseCase } from '../application/use-cases/soft-delete-provider.use-case.js';
import { User, UserStatus } from '../domain/entities/user.entity.js';
import { Email } from '../domain/value-objects/email.value-object.js';
import { UserRole } from '../domain/value-objects/user-role.value-object.js';
import { config } from '../config/env.js';
import { DatabaseFactory } from '../infrastructure/database/database-factory.js';
import { PostgresUserRepository } from '../infrastructure/persistence/postgres/postgres-user.repository.js';
import { PostgresSessionRepository } from '../infrastructure/persistence/postgres/postgres-session.repository.js';
import { PostgresLoginAttemptRepository } from '../infrastructure/persistence/postgres/postgres-login-attempt.repository.js';
import { Provider, ProviderStatus } from '../domain/entities/provider.entity.js';
import { Cif } from '../domain/value-objects/cif.value-object.js';
import { InMemoryProviderRepository } from '../infrastructure/persistence/in-memory/in-memory-provider.repository.js';
import { PostgresProviderRepository } from '../infrastructure/persistence/postgres/postgres-provider.repository.js';
import { CreateProviderUseCase } from '../application/use-cases/create-provider.use-case.js';
import { InMemoryInvoiceRepository } from '../infrastructure/persistence/in-memory/in-memory-invoice.repository.js';
import { CreateManualInvoiceUseCase } from '../application/use-cases/create-manual-invoice.use-case.js';
import { AttachInvoiceFileUseCase } from '../application/use-cases/attach-invoice-file.use-case.js';
import { InMemoryFileStorage } from '../infrastructure/adapters/in-memory/in-memory-file-storage.js';
import { LocalFileStorage } from '../infrastructure/adapters/local/local-file-storage.js';

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
const providerRepository = usePostgres && sqlClient
    ? new PostgresProviderRepository(sqlClient)
    : new InMemoryProviderRepository();
const invoiceRepository = new InMemoryInvoiceRepository();
const fileStorage = config.STORAGE_TYPE === 'local'
    ? new LocalFileStorage(config.STORAGE_PATH)
    : new InMemoryFileStorage();
const auditLogger = new InMemoryAuditLogger();
const dateProvider = new SystemDateProvider();
const userIdGenerator = new TimestampUserIdGenerator();
const providerIdGenerator = new TimestampProviderIdGenerator();
const invoiceIdGenerator = new TimestampInvoiceIdGenerator();
const invoiceMovementIdGenerator = new TimestampInvoiceMovementIdGenerator();
const sessionIdGenerator = new TimestampSessionIdGenerator();
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
    sessionIdGenerator,
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
    userIdGenerator,
    auditLogger,
    dateProvider,
});

const listUsersUseCase = new ListUsersUseCase({
    userRepository,
});

const getUserDetailUseCase = new GetUserDetailUseCase({
    userRepository,
});

const updateUserUseCase = new UpdateUserUseCase({
    userRepository,
    now: () => new Date(),
});

const updateUserStatusUseCase = new UpdateUserStatusUseCase({
    userRepository,
    now: () => new Date(),
});

const softDeleteUserUseCase = new SoftDeleteUserUseCase({
    userRepository,
    sessionRepository,
    now: () => new Date(),
});

const updateOwnProfileUseCase = new UpdateOwnProfileUseCase({
    userRepository,
    now: () => new Date(),
});

const revokeUserSessionsUseCase = new RevokeUserSessionsUseCase({
    userRepository,
    sessionRepository,
});

const createProviderUseCase = new CreateProviderUseCase({
    providerRepository,
    providerIdGenerator,
    auditLogger,
    dateProvider,
});

const listProvidersUseCase = new ListProvidersUseCase({
    providerRepository,
});

const getProviderDetailUseCase = new GetProviderDetailUseCase({
    providerRepository,
});

const updateProviderUseCase = new UpdateProviderUseCase({
    providerRepository,
    auditLogger,
    dateProvider,
});

const updateProviderStatusUseCase = new UpdateProviderStatusUseCase({
    providerRepository,
    auditLogger,
    dateProvider,
});

const softDeleteProviderUseCase = new SoftDeleteProviderUseCase({
    providerRepository,
    auditLogger,
    dateProvider,
});

const createManualInvoiceUseCase = new CreateManualInvoiceUseCase({
    providerRepository,
    invoiceRepository,
    auditLogger,
    dateProvider,
    invoiceIdGenerator,
    invoiceMovementIdGenerator,
});

const attachInvoiceFileUseCase = new AttachInvoiceFileUseCase({
    invoiceRepository,
    fileStorage,
    auditLogger,
    dateProvider,
});

export const compositionRoot = {
    userRepository,
    sessionRepository,
    loginAttemptRepository,
    providerRepository,
    invoiceRepository,
    fileStorage,
    auditLogger,
    dateProvider,
    userIdGenerator,
    invoiceIdGenerator,
    invoiceMovementIdGenerator,
    passwordHasher,
    refreshTokenHasher,
    tokenService,
    loginRateLimiter,
    unitOfWork,
    sessionIdGenerator,
    loginUserUseCase,
    createUserUseCase,
    listUsersUseCase,
    getUserDetailUseCase,
    updateUserUseCase,
    updateUserStatusUseCase,
    softDeleteUserUseCase,
    updateOwnProfileUseCase,
    revokeUserSessionsUseCase,
    createProviderUseCase,
    listProvidersUseCase,
    getProviderDetailUseCase,
    updateProviderUseCase,
    updateProviderStatusUseCase,
    softDeleteProviderUseCase,
    createManualInvoiceUseCase,
    attachInvoiceFileUseCase,
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
    const userHash = await bcrypt.hash('UserPass1!a01', saltRounds);

    userRepository.add(
        User.create({
            id: 'admin-1',
            email: Email.create('admin@example.com'),
            passwordHash: adminHash,
            status: UserStatus.Active,
            roles: [UserRole.admin()],
            createdAt: now,
            updatedAt: now,
            name: 'Admin User'
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
            name: 'Regular User'
        }),
    );

    if (providerRepository instanceof InMemoryProviderRepository) {
        providerRepository.add(
            Provider.create({
                id: 'provider-1',
                razonSocial: 'Proveedor Alpha SL',
                cif: Cif.create('B12345678'),
                direccion: 'Calle Mayor 1',
                poblacion: 'Madrid',
                provincia: 'Madrid',
                pais: 'ES',
                status: ProviderStatus.Active,
                createdAt: now,
                updatedAt: now,
            }),
        );

        providerRepository.add(
            Provider.create({
                id: 'provider-2',
                razonSocial: 'Proveedor Beta SL',
                cif: Cif.create('A87654321'),
                direccion: 'Avenida Diagonal 100',
                poblacion: 'Barcelona',
                provincia: 'Barcelona',
                pais: 'ES',
                status: ProviderStatus.Active,
                createdAt: now,
                updatedAt: now,
            }),
        );
    }
};
