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
import { ok } from '../../../src/shared/result.js';
import { createTestUser } from '../../shared/fixtures/user.fixture.js';

const fixedNow = new Date('2026-01-29T12:00:00.000Z');

class FixedDateProvider implements DateProvider {
    constructor(private readonly date: Date) {}

    now() {
        return ok(this.date);
    }
}

class SessionRepositorySpy implements SessionRepository {
    created: Session | null = null;
    updated: Session | null = null;
    session: Session | null = null;

    async create(session: Session) {
        this.created = session;
        return ok(undefined);
    }

    async findByRefreshTokenHash(_hash: string) {
        return ok(this.session);
    }

    async update(session: Session) {
        this.updated = session;
        return ok(undefined);
    }

    async revokeByUserId(_userId: string) {
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
    private refreshCount = 0;

    createAccessToken(payload: AccessTokenPayload) {
        this.accessPayloads.push(payload);
        return ok('access-token');
    }

    createRefreshToken(payload: RefreshTokenPayload) {
        this.refreshPayloads.push(payload);
        this.refreshCount += 1;
        return ok(`refresh-token-${this.refreshCount}`);
    }

    verifyAccessToken(_token: string) {
        return ok({ userId: 'user-1', roles: [UserRole.user()] });
    }
}

class RefreshTokenHasherStub implements RefreshTokenHasher {
    hash(value: string) {
        return ok(`hashed:${value}`);
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
            findByEmail: async () => ok(null),
            findById: async () => ok(createUser()),
            create: async () => ok(undefined),
            list: async () => ok({ items: [], total: 0 }),
            update: async () => ok(undefined),
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

const validRefreshTokenValue = 'refresh-token';
const invalidRefreshTokenValue = 'invalid';

const createSession = (overrides: Partial<SessionProps> = {}): Session =>
    Session.create({
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: `hashed:${validRefreshTokenValue}`,
        status: SessionStatus.Active,
        createdAt: fixedNow,
        lastUsedAt: fixedNow,
        expiresAt: new Date('2026-02-28T12:00:00.000Z'),
        ...overrides,
    });

const createUser = (overrides: Partial<UserProps> = {}): User =>
    createTestUser({
        now: fixedNow,
        overrides: {
            lockedUntil: undefined,
            ...overrides,
        },
    });

describe('RefreshAccessTokenUseCase', () => {
    it('issues a new access token when refresh token is valid', async () => {
        const session = createSession();
        const { useCase, auditLogger, tokenService, sessionRepository } = createUseCase();
        sessionRepository.session = session;

        const result = await useCase.execute({ refreshToken: validRefreshTokenValue });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.accessToken).toBe('access-token');
            expect(result.value.expiresIn).toBe(900);
            expect(result.value.refreshToken).toBeUndefined();
        }
        expect(tokenService.accessPayloads[0]?.userId).toBe(session.userId);
        expect(tokenService.accessPayloads[0]?.roles).toHaveLength(1);
        expect(tokenService.accessPayloads[0]?.roles[0]?.getValue()).toBe('USER');
        expect(auditLogger.events.some((event) => event.action === 'REFRESH_SUCCESS')).toBe(true);
    });

    it('rejects invalid refresh tokens', async () => {
        const { useCase, auditLogger, sessionRepository } = createUseCase();
        sessionRepository.session = null;

        const result = await useCase.execute({ refreshToken: invalidRefreshTokenValue });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(AuthInvalidRefreshTokenError);
        }

        expect(auditLogger.events.some((event) => event.action === 'REFRESH_FAIL')).toBe(true);
    });

    it('rejects expired sessions', async () => {
        const session = createSession({
            expiresAt: new Date('2026-01-01T00:00:00.000Z'),
        });
        const { useCase, auditLogger, sessionRepository } = createUseCase();
        sessionRepository.session = session;

        const result = await useCase.execute({ refreshToken: validRefreshTokenValue });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(AuthInvalidRefreshTokenError);
        }

        expect(auditLogger.events.some((event) => event.action === 'REFRESH_FAIL')).toBe(true);
    });

    it('rejects revoked sessions', async () => {
        const session = createSession({ status: SessionStatus.Revoked });
        const { useCase, auditLogger, sessionRepository } = createUseCase();
        sessionRepository.session = session;

        const result = await useCase.execute({ refreshToken: validRefreshTokenValue });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(AuthInvalidRefreshTokenError);
        }

        expect(auditLogger.events.some((event) => event.action === 'REFRESH_FAIL')).toBe(true);
    });

    it('rotates refresh tokens when enabled', async () => {
        const session = createSession();
        const { useCase, auditLogger, sessionRepository } = createUseCase({
            rotateRefreshTokens: true,
        });
        sessionRepository.session = session;

        const result = await useCase.execute({ refreshToken: validRefreshTokenValue });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.accessToken).toBe('access-token');
            expect(result.value.refreshToken).toBe('refresh-token-1');
        }
        expect(sessionRepository.updated).not.toBeNull();
        expect(sessionRepository.updated?.refreshTokenHash).toBe('hashed:refresh-token-1');
        expect(auditLogger.events.some((event) => event.action === 'REFRESH_SUCCESS')).toBe(true);
    });
});
