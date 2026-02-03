import { describe, expect, it } from 'vitest';
import { LoginUserUseCase } from '../../../src/application/use-cases/login-user.use-case.js';
import type { AuditEvent, AuditLogger } from '../../../src/application/ports/audit-logger.js';
import type { DateProvider } from '../../../src/application/ports/date-provider.js';
import type { LoginRateLimiter } from '../../../src/application/ports/login-rate-limiter.js';
import type { PasswordHasher } from '../../../src/application/ports/password-hasher.js';
import type { RefreshTokenHasher } from '../../../src/application/ports/refresh-token-hasher.js';
import type { SessionRepository } from '../../../src/application/ports/session.repository.js';
import type { AccessTokenPayload, RefreshTokenPayload, TokenService } from '../../../src/application/ports/token.service.js';
import type { UserRepository } from '../../../src/application/ports/user.repository.js';
import { AuthInvalidCredentialsError } from '../../../src/domain/errors/auth-invalid-credentials.error.js';
import { AuthRateLimitedError } from '../../../src/domain/errors/auth-rate-limited.error.js';
import { AuthUserDisabledError } from '../../../src/domain/errors/auth-user-disabled.error.js';
import { AuthUserLockedError } from '../../../src/domain/errors/auth-user-locked.error.js';
import { Session } from '../../../src/domain/entities/session.entity.js';
import { User, UserStatus } from '../../../src/domain/entities/user.entity.js';
import type { UserProps } from '../../../src/domain/entities/user.entity.js';
import { UserRole } from '../../../src/domain/value-objects/user-role.value-object.js';
import { Email } from '../../../src/domain/value-objects/email.value-object.js';
import { fail, ok } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-01-29T10:00:00.000Z');

const createUser = (overrides: Partial<UserProps> = {}): User =>
    User.create({
        id: 'user-1',
        email: Email.create('user@example.com'),
        passwordHash: 'hashed-password',
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

class FixedDateProvider implements DateProvider {
    constructor(private readonly date: Date) {}

    now() {
        return ok(this.date);
    }
}

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
}

class AuditLoggerSpy implements AuditLogger {
    events: AuditEvent[] = [];

    async log(event: AuditEvent) {
        this.events.push(event);
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

    async verify(plainText: string, hash: string) {
        void plainText;
        void hash;
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
    async assertAllowed(email: string, ip?: string) {
        void email;
        void ip;
        return ok(undefined);
    }
}

class BlockingRateLimiter implements LoginRateLimiter {
    async assertAllowed() {
        return fail(new AuthRateLimitedError());
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
    dateProvider: DateProvider;
    accessTokenTtlSeconds: number;
    refreshTokenTtlSeconds: number;
};

const createUseCase = (dependencies: Partial<UseCaseDependencies> = {}): {
    useCase: LoginUserUseCase;
    sessionRepository: SessionRepositorySpy;
    auditLogger: AuditLoggerSpy;
    tokenService: TokenServiceStub;
} => {
    const sessionRepository = new SessionRepositorySpy();
    const auditLogger = new AuditLoggerSpy();
    const tokenService = new TokenServiceStub();

    const resolvedDependencies: UseCaseDependencies = {
        userRepository: buildUserRepository(createUser()),
        sessionRepository,
        passwordHasher: new PasswordHasherStub(true),
        tokenService,
        refreshTokenHasher: new RefreshTokenHasherStub(),
        auditLogger,
        loginRateLimiter: new AllowAllRateLimiter(),
        dateProvider: new FixedDateProvider(fixedNow),
        accessTokenTtlSeconds: 900,
        refreshTokenTtlSeconds: 2_592_000,
        ...dependencies,
    };

    return {
        useCase: new LoginUserUseCase(resolvedDependencies),
        sessionRepository,
        auditLogger,
        tokenService,
    };
};

describe('LoginUserUseCase', () => {
    it('authenticates a user and returns tokens', async () => {
        const user = createUser();
        const { useCase, sessionRepository, auditLogger, tokenService } = createUseCase({
            userRepository: buildUserRepository(user),
        });

        const result = await useCase.execute({
            email: user.email,
            password: 'valid-password',
            ip: '127.0.0.1',
            userAgent: 'unit-test',
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.accessToken).toBe('access-token');
            expect(result.value.refreshToken).toBe('refresh-token');
            expect(result.value.expiresIn).toBe(900);
        }
        expect(sessionRepository.created).not.toBeNull();
        expect(sessionRepository.created?.refreshTokenHash).toBe('hashed:refresh-token');
        expect(tokenService.accessPayloads[0]?.userId).toBe(user.id);
        expect(tokenService.accessPayloads[0]?.roles).toHaveLength(1);
        expect(tokenService.accessPayloads[0]?.roles[0]?.getValue()).toBe('USER');
        expect(auditLogger.events.some((event) => event.action === 'LOGIN_SUCCESS')).toBe(true);
    });

    it('rejects invalid credentials with a generic error', async () => {
        const user = createUser();
        const { useCase, sessionRepository, auditLogger } = createUseCase({
            userRepository: buildUserRepository(user),
            passwordHasher: new PasswordHasherStub(false),
        });

        const result = await useCase.execute({
            email: user.email,
            password: 'wrong-password',
            ip: '127.0.0.1',
            userAgent: 'unit-test',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(AuthInvalidCredentialsError);
        }

        expect(sessionRepository.created).toBeNull();
        expect(auditLogger.events.some((event) => event.action === 'LOGIN_FAIL')).toBe(true);
    });

    it('rejects inactive users', async () => {
        const user = createUser({ status: UserStatus.Inactive });
        const { useCase, sessionRepository, auditLogger } = createUseCase({
            userRepository: buildUserRepository(user),
        });

        const result = await useCase.execute({
            email: user.email,
            password: 'valid-password',
            ip: '127.0.0.1',
            userAgent: 'unit-test',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(AuthUserDisabledError);
        }

        expect(sessionRepository.created).toBeNull();
        expect(auditLogger.events.some((event) => event.action === 'LOGIN_FAIL')).toBe(true);
    });

    it('rejects locked users', async () => {
        const user = createUser({
            lockedUntil: new Date('2026-01-29T10:10:00.000Z'),
        });
        const { useCase, sessionRepository, auditLogger } = createUseCase({
            userRepository: buildUserRepository(user),
        });

        const result = await useCase.execute({
            email: user.email,
            password: 'valid-password',
            ip: '127.0.0.1',
            userAgent: 'unit-test',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(AuthUserLockedError);
        }

        expect(sessionRepository.created).toBeNull();
        expect(auditLogger.events.some((event) => event.action === 'LOGIN_FAIL')).toBe(true);
    });

    it('rejects rate-limited attempts', async () => {
        const user = createUser();
        const { useCase, sessionRepository, auditLogger } = createUseCase({
            userRepository: buildUserRepository(user),
            loginRateLimiter: new BlockingRateLimiter(),
        });

        const result = await useCase.execute({
            email: user.email,
            password: 'valid-password',
            ip: '127.0.0.1',
            userAgent: 'unit-test',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(AuthRateLimitedError);
        }

        expect(sessionRepository.created).toBeNull();
        expect(auditLogger.events.some((event) => event.action === 'LOGIN_FAIL')).toBe(true);
    });
});
