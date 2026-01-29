import { describe, expect, it } from 'vitest';
import { RefreshAccessTokenUseCase } from '../../../src/application/use-cases/refresh-access-token.use-case.js';
import type { AuditEvent, AuditLogger } from '../../../src/application/ports/audit-logger.js';
import type { DateProvider } from '../../../src/application/ports/date-provider.js';
import type { RefreshTokenHasher } from '../../../src/application/ports/refresh-token-hasher.js';
import type { SessionRepository } from '../../../src/application/ports/session.repository.js';
import type { AccessTokenPayload, RefreshTokenPayload, TokenService } from '../../../src/application/ports/token.service.js';
import type { UserRepository } from '../../../src/application/ports/user.repository.js';
import { AuthInvalidRefreshTokenError } from '../../../src/domain/errors/auth-invalid-refresh-token.error.js';
import { Session, SessionStatus } from '../../../src/domain/entities/session.entity.js';
import type { SessionProps } from '../../../src/domain/entities/session.entity.js';
import { User, UserStatus } from '../../../src/domain/entities/user.entity.js';
import type { UserProps } from '../../../src/domain/entities/user.entity.js';
import { UserRole } from '../../../src/domain/value-objects/user-role.value-object.js';

const fixedNow = new Date('2026-01-29T12:00:00.000Z');

class FixedDateProvider implements DateProvider {
    constructor(private readonly date: Date) {}

    now(): Date {
        return this.date;
    }
}

class SessionRepositorySpy implements SessionRepository {
    created: Session | null = null;
    updated: Session | null = null;
    session: Session | null = null;

    async create(session: Session): Promise<void> {
        this.created = session;
    }

    async findByRefreshTokenHash(hash: string): Promise<Session | null> {
        void hash;
        return this.session;
    }

    async update(session: Session): Promise<void> {
        this.updated = session;
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

class RefreshTokenHasherStub implements RefreshTokenHasher {
    hash(value: string): string {
        return `hashed:${value}`;
    }
}

type UseCaseDependencies = {
    sessionRepository: SessionRepository;
    userRepository: UserRepository;
    tokenService: TokenService;
    refreshTokenHasher: RefreshTokenHasher;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
    accessTokenTtlSeconds: number;
    refreshTokenTtlSeconds: number;
    rotateRefreshTokens: boolean;
};

const createUseCase = (dependencies: Partial<UseCaseDependencies> = {}): {
    useCase: RefreshAccessTokenUseCase;
    sessionRepository: SessionRepositorySpy;
    auditLogger: AuditLoggerSpy;
    tokenService: TokenServiceStub;
} => {
    const sessionRepository = new SessionRepositorySpy();
    const auditLogger = new AuditLoggerSpy();
    const tokenService = new TokenServiceStub();

    const resolvedDependencies: UseCaseDependencies = {
        sessionRepository,
        userRepository: {
            findByEmail: async () => null,
            findById: async () => createUser(),
        },
        tokenService,
        refreshTokenHasher: new RefreshTokenHasherStub(),
        auditLogger,
        dateProvider: new FixedDateProvider(fixedNow),
        accessTokenTtlSeconds: 900,
        refreshTokenTtlSeconds: 2_592_000,
        rotateRefreshTokens: false,
        ...dependencies,
    };

    return {
        useCase: new RefreshAccessTokenUseCase(resolvedDependencies),
        sessionRepository,
        auditLogger,
        tokenService,
    };
};

const createSession = (overrides: Partial<SessionProps> = {}): Session =>
    Session.create({
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'hashed:refresh-token',
        status: SessionStatus.Active,
        createdAt: fixedNow,
        lastUsedAt: fixedNow,
        expiresAt: new Date('2026-02-28T12:00:00.000Z'),
        ...overrides,
    });

const createUser = (overrides: Partial<UserProps> = {}): User =>
    User.create({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'hash',
        status: UserStatus.Active,
        lockedUntil: undefined,
        roles: [UserRole.user()],
        createdAt: fixedNow,
        updatedAt: fixedNow,
        ...overrides,
    });

describe('RefreshAccessTokenUseCase', () => {
    it('issues a new access token when refresh token is valid', async () => {
        const session = createSession();
        const { useCase, auditLogger, tokenService, sessionRepository } = createUseCase();
        sessionRepository.session = session;

        const result = await useCase.execute({ refreshToken: 'refresh-token' });

        expect(result.accessToken).toBe('access-token');
        expect(result.expiresIn).toBe(900);
        expect(result.refreshToken).toBeUndefined();
        expect(tokenService.accessPayloads[0]?.userId).toBe(session.userId);
        expect(tokenService.accessPayloads[0]?.roles).toHaveLength(1);
        expect(tokenService.accessPayloads[0]?.roles[0]?.getValue()).toBe('USER');
        expect(auditLogger.events.some((event) => event.action === 'REFRESH_SUCCESS')).toBe(true);
    });

    it('rejects invalid refresh tokens', async () => {
        const { useCase, auditLogger, sessionRepository } = createUseCase();
        sessionRepository.session = null;

        await expect(
            useCase.execute({ refreshToken: 'invalid' }),
        ).rejects.toBeInstanceOf(AuthInvalidRefreshTokenError);

        expect(auditLogger.events.some((event) => event.action === 'REFRESH_FAIL')).toBe(true);
    });

    it('rejects expired sessions', async () => {
        const session = createSession({
            expiresAt: new Date('2026-01-01T00:00:00.000Z'),
        });
        const { useCase, auditLogger, sessionRepository } = createUseCase();
        sessionRepository.session = session;

        await expect(
            useCase.execute({ refreshToken: 'refresh-token' }),
        ).rejects.toBeInstanceOf(AuthInvalidRefreshTokenError);

        expect(auditLogger.events.some((event) => event.action === 'REFRESH_FAIL')).toBe(true);
    });

    it('rejects revoked sessions', async () => {
        const session = createSession({ status: SessionStatus.Revoked });
        const { useCase, auditLogger, sessionRepository } = createUseCase();
        sessionRepository.session = session;

        await expect(
            useCase.execute({ refreshToken: 'refresh-token' }),
        ).rejects.toBeInstanceOf(AuthInvalidRefreshTokenError);

        expect(auditLogger.events.some((event) => event.action === 'REFRESH_FAIL')).toBe(true);
    });

    it('rotates refresh tokens when enabled', async () => {
        const session = createSession();
        const { useCase, auditLogger, sessionRepository } = createUseCase({
            rotateRefreshTokens: true,
        });
        sessionRepository.session = session;

        const result = await useCase.execute({ refreshToken: 'refresh-token' });

        expect(result.accessToken).toBe('access-token');
        expect(result.refreshToken).toBe('refresh-token');
        expect(sessionRepository.updated).not.toBeNull();
        expect(sessionRepository.updated?.refreshTokenHash).toBe('hashed:refresh-token');
        expect(auditLogger.events.some((event) => event.action === 'REFRESH_SUCCESS')).toBe(true);
    });
});
