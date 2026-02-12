import { describe, expect, it } from 'vitest';
import { LoginUserUseCase } from '@application/use-cases/login-user.use-case.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { LoginRateLimiter } from '@application/ports/login-rate-limiter.js';
import type { LoginAttemptRepository } from '@application/ports/login-attempt.repository.js';
import type { PasswordHasher } from '@application/ports/password-hasher.js';
import type { RefreshTokenHasher } from '@application/ports/refresh-token-hasher.js';
import type { SessionIdGenerator } from '@application/ports/session-id-generator.js';
import type { SessionRepository } from '@application/ports/session.repository.js';
import type { AccessTokenPayload, RefreshTokenPayload, TokenService } from '@application/ports/token.service.js';
import type { UserRepository } from '@application/ports/user.repository.js';
import { AuthInvalidCredentialsError } from '@domain/errors/auth-invalid-credentials.error.js';
import { AuthRateLimitedError } from '@domain/errors/auth-rate-limited.error.js';
import { AuthUserDisabledError } from '@domain/errors/auth-user-disabled.error.js';
import { AuthUserLockedError } from '@domain/errors/auth-user-locked.error.js';
import { Session } from '@domain/entities/session.entity.js';
import { User, UserStatus } from '@domain/entities/user.entity.js';
import type { UserProps } from '@domain/entities/user.entity.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { Email } from '@domain/value-objects/email.value-object.js';
import { fail, ok } from '@shared/result.js';
import { DateProviderStub } from '../../shared/stubs/date-provider.stub.js';
import { AuditLoggerSpy } from '../../shared/spies/audit-logger.spy.js';
import { fixedNow } from '../../shared/fixed-now.js';

const testCredentialHashValue = 'hashed-password';
const validLoginCredential = 'valid-password';
const invalidLoginCredential = 'wrong-password';

const createUser = (overrides: Partial<UserProps> = {}): User =>
    User.create({
        id: 'user-1',
        email: Email.create('user@example.com'),
        passwordHash: testCredentialHashValue,
        status: UserStatus.Active,
        lockedUntil: undefined,
        roles: [UserRole.user()],
        createdAt: fixedNow,
        updatedAt: fixedNow,
        ...overrides,
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

class TokenServiceStub implements TokenService {
    accessPayloads: AccessTokenPayload[] = [];
    refreshPayloads: RefreshTokenPayload[] = [];

    createAccessToken(payload: AccessTokenPayload) {
        this.accessPayloads.push(payload);
        return ok('access-token');
    }

    createRefreshToken(payload: RefreshTokenPayload) {
        this.refreshPayloads.push(payload);
        return ok('refresh-token');
    }

    verifyAccessToken() {
        return ok({ userId: 'user-1', roles: [UserRole.user()] });
    }
}

class PasswordHasherStub implements PasswordHasher {
    constructor(private readonly valid: boolean) {}

    async verify(_plainText: string, _hash: string) {
        return ok(this.valid);
    }

    async hash(value: string) {
        return ok(`hashed:${value}`);
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

class SessionIdGeneratorStub implements SessionIdGenerator {
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
        this.attempts.push({ email: key.email, ip: key.ip, succeeded, timestamp });
        return ok(undefined);
    }
}

type UseCaseDependencies = {
    userRepository: UserRepository;
    sessionRepository: SessionRepository;
    passwordHasher: PasswordHasher;
    tokenService: TokenService;
    refreshTokenHasher: RefreshTokenHasher;
    auditLogger: AuditLoggerSpy;
    loginRateLimiter: LoginRateLimiter;
    loginAttemptRepository: LoginAttemptRepository;
    dateProvider: DateProvider;
    sessionIdGenerator: SessionIdGenerator;
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
});
