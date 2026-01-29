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

const fixedNow = new Date('2026-01-29T10:00:00.000Z');

const createUser = (overrides: Partial<UserProps> = {}): User =>
    User.create({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'hashed-password',
        status: UserStatus.Active,
        lockedUntil: undefined,
        roles: [UserRole.user()],
        createdAt: fixedNow,
        updatedAt: fixedNow,
        ...overrides,
    });

class FixedDateProvider implements DateProvider {
    constructor(private readonly date: Date) {}

    now(): Date {
        return this.date;
    }
}

class SessionRepositorySpy implements SessionRepository {
    created: Session | null = null;

    async create(session: Session): Promise<void> {
        this.created = session;
    }
}

class AuditLoggerSpy implements AuditLogger {
    events: AuditEvent[] = [];

    async log(event: AuditEvent): Promise<void> {
        this.events.push(event);
    }
}

class TokenServiceStub implements TokenService {
    accessPayloads: AccessTokenPayload[] = [];
    refreshPayloads: RefreshTokenPayload[] = [];

    createAccessToken(payload: AccessTokenPayload): string {
        this.accessPayloads.push(payload);
        return 'access-token';
    }

    createRefreshToken(payload: RefreshTokenPayload): string {
        this.refreshPayloads.push(payload);
        return 'refresh-token';
    }
}

class PasswordHasherStub implements PasswordHasher {
    constructor(private readonly valid: boolean) {}

    async verify(plainText: string, hash: string): Promise<boolean> {
        void plainText;
        void hash;
        return this.valid;
    }
}

class RefreshTokenHasherStub implements RefreshTokenHasher {
    hash(value: string): string {
        return `hashed:${value}`;
    }
}

class AllowAllRateLimiter implements LoginRateLimiter {
    async assertAllowed(email: string, ip?: string): Promise<void> {
        void email;
        void ip;
    }
}

class BlockingRateLimiter implements LoginRateLimiter {
    async assertAllowed(): Promise<void> {
        throw new AuthRateLimitedError();
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
        userRepository: { findByEmail: async () => createUser() },
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
            userRepository: { findByEmail: async () => user },
        });

        const result = await useCase.execute({
            email: user.email,
            password: 'valid-password',
            ip: '127.0.0.1',
            userAgent: 'unit-test',
        });

        expect(result.accessToken).toBe('access-token');
        expect(result.refreshToken).toBe('refresh-token');
        expect(result.expiresIn).toBe(900);
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
            userRepository: { findByEmail: async () => user },
            passwordHasher: new PasswordHasherStub(false),
        });

        await expect(
            useCase.execute({
                email: user.email,
                password: 'wrong-password',
                ip: '127.0.0.1',
                userAgent: 'unit-test',
            }),
        ).rejects.toBeInstanceOf(AuthInvalidCredentialsError);

        expect(sessionRepository.created).toBeNull();
        expect(auditLogger.events.some((event) => event.action === 'LOGIN_FAIL')).toBe(true);
    });

    it('rejects inactive users', async () => {
        const user = createUser({ status: UserStatus.Inactive });
        const { useCase, sessionRepository, auditLogger } = createUseCase({
            userRepository: { findByEmail: async () => user },
        });

        await expect(
            useCase.execute({
                email: user.email,
                password: 'valid-password',
                ip: '127.0.0.1',
                userAgent: 'unit-test',
            }),
        ).rejects.toBeInstanceOf(AuthUserDisabledError);

        expect(sessionRepository.created).toBeNull();
        expect(auditLogger.events.some((event) => event.action === 'LOGIN_FAIL')).toBe(true);
    });

    it('rejects locked users', async () => {
        const user = createUser({
            lockedUntil: new Date('2026-01-29T10:10:00.000Z'),
        });
        const { useCase, sessionRepository, auditLogger } = createUseCase({
            userRepository: { findByEmail: async () => user },
        });

        await expect(
            useCase.execute({
                email: user.email,
                password: 'valid-password',
                ip: '127.0.0.1',
                userAgent: 'unit-test',
            }),
        ).rejects.toBeInstanceOf(AuthUserLockedError);

        expect(sessionRepository.created).toBeNull();
        expect(auditLogger.events.some((event) => event.action === 'LOGIN_FAIL')).toBe(true);
    });

    it('rejects rate-limited attempts', async () => {
        const user = createUser();
        const { useCase, sessionRepository, auditLogger } = createUseCase({
            userRepository: { findByEmail: async () => user },
            loginRateLimiter: new BlockingRateLimiter(),
        });

        await expect(
            useCase.execute({
                email: user.email,
                password: 'valid-password',
                ip: '127.0.0.1',
                userAgent: 'unit-test',
            }),
        ).rejects.toBeInstanceOf(AuthRateLimitedError);

        expect(sessionRepository.created).toBeNull();
        expect(auditLogger.events.some((event) => event.action === 'LOGIN_FAIL')).toBe(true);
    });
});
