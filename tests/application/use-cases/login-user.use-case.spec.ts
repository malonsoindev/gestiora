import { describe, expect, it } from 'vitest';
import { LoginUserUseCase } from '@application/use-cases/login-user.use-case.js';
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
import { PortError } from '@application/errors/port.error.js';
import { AuthInvalidCredentialsError } from '@domain/errors/auth-invalid-credentials.error.js';
import { AuthRateLimitedError } from '@domain/errors/auth-rate-limited.error.js';
import { AuthUserDisabledError } from '@domain/errors/auth-user-disabled.error.js';
import { AuthUserLockedError } from '@domain/errors/auth-user-locked.error.js';
import { Session } from '@domain/entities/session.entity.js';
import { User, UserStatus } from '@domain/entities/user.entity.js';
import type { UserProps } from '@domain/entities/user.entity.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { fail, ok } from '@shared/result.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { PasswordHasherStub } from '@tests/shared/stubs/password-hasher.stub.js';
import { TokenServiceStub } from '@tests/shared/stubs/token-service.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import { fixedNow } from '@tests/shared/fixed-now.js';
import { createTestUser } from '@tests/shared/fixtures/user.fixture.js';

const testCredentialHashValue = 'hashed-password';
const validLoginCredential = 'valid-password';
const invalidLoginCredential = 'wrong-password';

const createUser = (overrides: Partial<UserProps> = {}): User =>
    createTestUser({
        now: fixedNow,
        overrides: {
            passwordHash: testCredentialHashValue,
            status: UserStatus.Active,
            roles: [UserRole.user()],
            ...overrides,
        },
    });

const buildUserRepository = (user: User | null): UserRepository => ({
    findByEmail: async () => ok(user),
    findById: async () => ok(user),
    create: async () => ok(undefined),
    list: async () => ok({ items: [], total: 0 }),
    update: async () => ok(undefined),
});

class SessionRepositorySpy implements SessionRepository {
    created: Session | null = null;
    updated: Session | null = null;

    async create(session: Session) {
        this.created = session;
        return ok(undefined);
    }

    async findByRefreshTokenHash() {
        return ok(null);
    }

    async update(session: Session) {
        this.updated = session;
        return ok(undefined);
    }

    async revokeByUserId() {
        return ok(undefined);
    }
}



class RefreshTokenHasherStub implements RefreshTokenHasher {
    hash(value: string) {
        return ok(`hashed:${value}`);
    }
}

class AllowAllRateLimiter implements LoginRateLimiter {
    async assertAllowed(_email: string, _ip?: string) {
        return ok(undefined);
    }
}

class BlockingRateLimiter implements LoginRateLimiter {
    async assertAllowed() {
        return fail(new AuthRateLimitedError());
    }
}

class SessionIdGeneratorStub implements IdGenerator {
    constructor(private readonly id: string) {}

    generate(): string {
        return this.id;
    }
}

class LoginAttemptRepositorySpy implements LoginAttemptRepository {
    attempts: Array<{ email: string; ip?: string; succeeded: boolean; timestamp: Date }> = [];

    async countFailedAttempts() {
        return ok(0);
    }

    async recordAttempt(
        key: { email: string; ip?: string },
        succeeded: boolean,
        timestamp: Date,
    ) {
        this.attempts.push({
            email: key.email,
            succeeded,
            timestamp,
            ...(key.ip === undefined ? {} : { ip: key.ip }),
        });
        return ok(undefined);
    }
}

// ========== PortError Stubs ==========

class FailingDateProvider implements DateProvider {
    now() {
        return fail(new PortError('DateProvider', 'Clock service unavailable'));
    }
}

class FailingRateLimiter implements LoginRateLimiter {
    async assertAllowed() {
        return fail(new PortError('LoginRateLimiter', 'Rate limiter unavailable'));
    }
}

const buildFailingUserRepository = (method: 'findByEmail'): UserRepository => ({
    findByEmail: async () =>
        method === 'findByEmail'
            ? fail(new PortError('UserRepository', 'Database connection lost'))
            : ok(null),
    findById: async () => ok(null),
    create: async () => ok(undefined),
    list: async () => ok({ items: [], total: 0 }),
    update: async () => ok(undefined),
});

class FailingLoginAttemptRepository implements LoginAttemptRepository {
    async countFailedAttempts() {
        return ok(0);
    }

    async recordAttempt() {
        return fail(new PortError('LoginAttemptRepository', 'Database write failed'));
    }
}

class FailingAuditLogger implements AuditLogger {
    async log() {
        return fail(new PortError('AuditLogger', 'Audit service unavailable'));
    }
}

class FailingPasswordHasher implements PasswordHasher {
    async verify() {
        return fail(new PortError('PasswordHasher', 'Hashing service unavailable'));
    }

    async hash() {
        return fail(new PortError('PasswordHasher', 'Hashing service unavailable'));
    }
}

class FailingRefreshTokenHasher implements RefreshTokenHasher {
    hash() {
        return fail(new PortError('RefreshTokenHasher', 'Hashing service unavailable'));
    }
}

class FailingTokenService implements TokenService {
    private readonly failOn: 'createAccessToken' | 'createRefreshToken' | 'verifyAccessToken' | 'verifyRefreshToken';

    constructor(failOn: 'createAccessToken' | 'createRefreshToken' | 'verifyAccessToken' | 'verifyRefreshToken') {
        this.failOn = failOn;
    }

    createAccessToken() {
        if (this.failOn === 'createAccessToken') {
            return fail(new PortError('TokenService', 'Token signing failed'));
        }
        return ok('access-token');
    }

    createRefreshToken() {
        if (this.failOn === 'createRefreshToken') {
            return fail(new PortError('TokenService', 'Token signing failed'));
        }
        return ok('refresh-token');
    }

    verifyAccessToken() {
        return fail(new PortError('TokenService', 'Token verification failed'));
    }

    verifyRefreshToken() {
        return fail(new PortError('TokenService', 'Token verification failed'));
    }
}

class FailingSessionRepository implements SessionRepository {
    async create() {
        return fail(new PortError('SessionRepository', 'Database write failed'));
    }

    async findByRefreshTokenHash() {
        return ok(null);
    }

    async update() {
        return ok(undefined);
    }

    async revokeByUserId() {
        return ok(undefined);
    }
}

type UseCaseDependencies = {
    userRepository: UserRepository;
    sessionRepository: SessionRepository;
    passwordHasher: PasswordHasher;
    tokenService: TokenService;
    refreshTokenHasher: RefreshTokenHasher;
    auditLogger: AuditLogger;
    loginRateLimiter: LoginRateLimiter;
    loginAttemptRepository: LoginAttemptRepository;
    dateProvider: DateProvider;
    sessionIdGenerator: IdGenerator;
    accessTokenTtlSeconds: number;
    refreshTokenTtlSeconds: number;
};

const createUseCase = (dependencies: Partial<UseCaseDependencies> = {}): {
    useCase: LoginUserUseCase;
    sessionRepository: SessionRepositorySpy;
    auditLogger: AuditLoggerSpy;
    tokenService: TokenServiceStub;
    loginAttemptRepository: LoginAttemptRepositorySpy;
} => {
    const sessionRepository = new SessionRepositorySpy();
    const auditLogger = new AuditLoggerSpy();
    const tokenService = new TokenServiceStub();
    const loginAttemptRepository = new LoginAttemptRepositorySpy();

    const resolvedDependencies: UseCaseDependencies = {
        userRepository: buildUserRepository(createUser()),
        sessionRepository,
        passwordHasher: new PasswordHasherStub(true),
        tokenService,
        refreshTokenHasher: new RefreshTokenHasherStub(),
        auditLogger,
        loginRateLimiter: new AllowAllRateLimiter(),
        loginAttemptRepository,
        dateProvider: new DateProviderStub(fixedNow),
        sessionIdGenerator: new SessionIdGeneratorStub('session-fixed'),
        accessTokenTtlSeconds: 900,
        refreshTokenTtlSeconds: 2_592_000,
        ...dependencies,
    };

    return {
        useCase: new LoginUserUseCase(resolvedDependencies),
        sessionRepository,
        auditLogger,
        tokenService,
        loginAttemptRepository,
    };
};

const buildLoginRequest = (overrides: Partial<{ email: string; password: string; ip: string; userAgent: string }> = {}) => ({
    email: 'user@example.com',
    password: validLoginCredential,
    ip: '127.0.0.1',
    userAgent: 'unit-test',
    ...overrides,
});

describe('LoginUserUseCase', () => {
    it('authenticates a user and returns tokens', async () => {
        const user = createUser();
        const { useCase, sessionRepository, auditLogger, tokenService, loginAttemptRepository } = createUseCase({
            userRepository: buildUserRepository(user),
        });

        const result = await useCase.execute(buildLoginRequest({ email: user.email }));

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.accessToken).toBe('access-token');
            expect(result.value.refreshToken).toBe('refresh-token');
            expect(result.value.expiresIn).toBe(900);
        }
        expect(sessionRepository.created).not.toBeNull();
        expect(sessionRepository.created?.id).toBe('session-fixed');
        expect(sessionRepository.created?.refreshTokenHash).toBe('hashed:refresh-token');
        expect(tokenService.accessPayloads[0]?.userId).toBe(user.id);
        expect(tokenService.accessPayloads[0]?.roles).toHaveLength(1);
        expect(tokenService.accessPayloads[0]?.roles[0]?.getValue()).toBe('USER');
        expect(auditLogger.events.some((event) => event.action === 'LOGIN_SUCCESS')).toBe(true);
        expect(loginAttemptRepository.attempts).toHaveLength(1);
        expect(loginAttemptRepository.attempts[0]?.succeeded).toBe(true);
    });

    it('rejects invalid credentials with a generic error', async () => {
        const user = createUser();
        const { useCase, sessionRepository, auditLogger, loginAttemptRepository } = createUseCase({
            userRepository: buildUserRepository(user),
            passwordHasher: new PasswordHasherStub(false),
        });

        const result = await useCase.execute(buildLoginRequest({
            email: user.email,
            password: invalidLoginCredential,
        }));

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(AuthInvalidCredentialsError);
        }

        expect(sessionRepository.created).toBeNull();
        expect(auditLogger.events.some((event) => event.action === 'LOGIN_FAIL')).toBe(true);
        expect(loginAttemptRepository.attempts).toHaveLength(1);
        expect(loginAttemptRepository.attempts[0]?.succeeded).toBe(false);
    });

    it('rejects inactive users', async () => {
        const user = createUser({ status: UserStatus.Inactive });
        const { useCase, sessionRepository, auditLogger, loginAttemptRepository } = createUseCase({
            userRepository: buildUserRepository(user),
        });

        const result = await useCase.execute(buildLoginRequest({ email: user.email }));

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(AuthUserDisabledError);
        }

        expect(sessionRepository.created).toBeNull();
        expect(auditLogger.events.some((event) => event.action === 'LOGIN_FAIL')).toBe(true);
        expect(loginAttemptRepository.attempts).toHaveLength(1);
        expect(loginAttemptRepository.attempts[0]?.succeeded).toBe(false);
    });

    it('rejects locked users', async () => {
        const user = createUser({
            lockedUntil: new Date('2026-01-29T10:10:00.000Z'),
        });
        const { useCase, sessionRepository, auditLogger, loginAttemptRepository } = createUseCase({
            userRepository: buildUserRepository(user),
            dateProvider: new DateProviderStub(new Date('2026-01-29T10:00:00.000Z')),
        });

        const result = await useCase.execute(buildLoginRequest({ email: user.email }));

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(AuthUserLockedError);
        }

        expect(sessionRepository.created).toBeNull();
        expect(auditLogger.events.some((event) => event.action === 'LOGIN_FAIL')).toBe(true);
        expect(loginAttemptRepository.attempts).toHaveLength(1);
        expect(loginAttemptRepository.attempts[0]?.succeeded).toBe(false);
    });

    it('rejects rate-limited attempts', async () => {
        const user = createUser();
        const { useCase, sessionRepository, auditLogger, loginAttemptRepository } = createUseCase({
            userRepository: buildUserRepository(user),
            loginRateLimiter: new BlockingRateLimiter(),
        });

        const result = await useCase.execute(buildLoginRequest({ email: user.email }));

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(AuthRateLimitedError);
        }

        expect(sessionRepository.created).toBeNull();
        expect(auditLogger.events.some((event) => event.action === 'LOGIN_FAIL')).toBe(true);
        expect(loginAttemptRepository.attempts).toHaveLength(1);
        expect(loginAttemptRepository.attempts[0]?.succeeded).toBe(false);
    });

    describe('PortError propagation', () => {
        it('propagates PortError when DateProvider.now fails', async () => {
            const { useCase } = createUseCase({
                dateProvider: new FailingDateProvider(),
            });

            const result = await useCase.execute(buildLoginRequest());

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('DateProvider');
            }
        });

        it('propagates PortError when LoginRateLimiter.assertAllowed fails', async () => {
            const { useCase } = createUseCase({
                loginRateLimiter: new FailingRateLimiter(),
            });

            const result = await useCase.execute(buildLoginRequest());

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('LoginRateLimiter');
            }
        });

        it('propagates PortError when UserRepository.findByEmail fails', async () => {
            const { useCase } = createUseCase({
                userRepository: buildFailingUserRepository('findByEmail'),
            });

            const result = await useCase.execute(buildLoginRequest());

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('UserRepository');
            }
        });

        it('propagates PortError when LoginAttemptRepository.recordAttempt fails during user-not-found logging', async () => {
            const { useCase } = createUseCase({
                userRepository: buildUserRepository(null),
                loginAttemptRepository: new FailingLoginAttemptRepository(),
            });

            const result = await useCase.execute(buildLoginRequest());

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('LoginAttemptRepository');
            }
        });

        it('propagates PortError when AuditLogger.log fails during failure logging', async () => {
            const { useCase } = createUseCase({
                userRepository: buildUserRepository(null),
                auditLogger: new FailingAuditLogger(),
            });

            const result = await useCase.execute(buildLoginRequest());

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('AuditLogger');
            }
        });

        it('propagates PortError when PasswordHasher.verify fails', async () => {
            const user = createUser();
            const { useCase } = createUseCase({
                userRepository: buildUserRepository(user),
                passwordHasher: new FailingPasswordHasher(),
            });

            const result = await useCase.execute(buildLoginRequest({ email: user.email }));

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('PasswordHasher');
            }
        });

        it('propagates PortError when TokenService.createRefreshToken fails', async () => {
            const user = createUser();
            const { useCase } = createUseCase({
                userRepository: buildUserRepository(user),
                tokenService: new FailingTokenService('createRefreshToken'),
            });

            const result = await useCase.execute(buildLoginRequest({ email: user.email }));

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('TokenService');
            }
        });

        it('propagates PortError when RefreshTokenHasher.hash fails', async () => {
            const user = createUser();
            const { useCase } = createUseCase({
                userRepository: buildUserRepository(user),
                refreshTokenHasher: new FailingRefreshTokenHasher(),
            });

            const result = await useCase.execute(buildLoginRequest({ email: user.email }));

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('RefreshTokenHasher');
            }
        });

        it('propagates PortError when SessionRepository.create fails', async () => {
            const user = createUser();
            const { useCase } = createUseCase({
                userRepository: buildUserRepository(user),
                sessionRepository: new FailingSessionRepository(),
            });

            const result = await useCase.execute(buildLoginRequest({ email: user.email }));

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('SessionRepository');
            }
        });

        it('propagates PortError when TokenService.createAccessToken fails', async () => {
            const user = createUser();
            const { useCase } = createUseCase({
                userRepository: buildUserRepository(user),
                tokenService: new FailingTokenService('createAccessToken'),
            });

            const result = await useCase.execute(buildLoginRequest({ email: user.email }));

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('TokenService');
            }
        });

        it('propagates PortError when LoginAttemptRepository.recordAttempt fails during success logging', async () => {
            const user = createUser();
            const { useCase } = createUseCase({
                userRepository: buildUserRepository(user),
                loginAttemptRepository: new FailingLoginAttemptRepository(),
            });

            const result = await useCase.execute(buildLoginRequest({ email: user.email }));

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('LoginAttemptRepository');
            }
        });

        it('propagates PortError when AuditLogger.log fails during success logging', async () => {
            const user = createUser();
            const { useCase } = createUseCase({
                userRepository: buildUserRepository(user),
                auditLogger: new FailingAuditLogger(),
            });

            const result = await useCase.execute(buildLoginRequest({ email: user.email }));

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('AuditLogger');
            }
        });
    });
});
