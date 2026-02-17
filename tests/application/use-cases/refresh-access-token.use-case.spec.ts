import { describe, expect, it } from 'vitest';
import { RefreshAccessTokenUseCase } from '@application/use-cases/refresh-access-token.use-case.js';
import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { RefreshTokenHasher } from '@application/ports/refresh-token-hasher.js';
import type { SessionRepository } from '@application/ports/session.repository.js';
import type { TokenService } from '@application/ports/token.service.js';
import type { UserRepository } from '@application/ports/user.repository.js';
import { PortError } from '@application/errors/port.error.js';
import { AuthInvalidRefreshTokenError } from '@domain/errors/auth-invalid-refresh-token.error.js';
import { Session, SessionStatus } from '@domain/entities/session.entity.js';
import type { SessionProps } from '@domain/entities/session.entity.js';
import { User } from '@domain/entities/user.entity.js';
import type { UserProps } from '@domain/entities/user.entity.js';
import { fail, ok } from '@shared/result.js';
import { createTestUser } from '@tests/shared/fixtures/user.fixture.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { TokenServiceStub } from '@tests/shared/stubs/token-service.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import {
    FailingDateProvider,
    FailingRefreshTokenHasher,
    FailingAuditLogger,
} from '@tests/shared/stubs/failing-stubs.js';

const fixedNow = new Date('2026-01-29T12:00:00.000Z');

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

class RefreshTokenHasherStub implements RefreshTokenHasher {
    hash(value: string) {
        return ok(`hashed:${value}`);
    }
}

// ========== Local PortError Stubs (with specific logic not suitable for centralization) ==========

class FailingSessionRepositoryOnMethod implements SessionRepository {
    private readonly failOn: 'findByRefreshTokenHash' | 'update';

    constructor(failOn: 'findByRefreshTokenHash' | 'update' = 'findByRefreshTokenHash') {
        this.failOn = failOn;
    }

    async create() {
        return ok(undefined);
    }

    async findByRefreshTokenHash() {
        if (this.failOn === 'findByRefreshTokenHash') {
            return fail(new PortError('SessionRepository', 'Database connection lost'));
        }
        return ok(null);
    }

    async update() {
        if (this.failOn === 'update') {
            return fail(new PortError('SessionRepository', 'Database write failed'));
        }
        return ok(undefined);
    }

    async revokeByUserId() {
        return ok(undefined);
    }
}

const buildFailingUserRepository = (): UserRepository => ({
    findByEmail: async () => ok(null),
    findById: async () => fail(new PortError('UserRepository', 'Database connection lost')),
    create: async () => ok(undefined),
    list: async () => ok({ items: [], total: 0 }),
    update: async () => ok(undefined),
});

class FailingTokenServiceOnMethod implements TokenService {
    private readonly failOn: 'createAccessToken' | 'createRefreshToken';

    constructor(failOn: 'createAccessToken' | 'createRefreshToken') {
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

class SessionRepositoryWithSession implements SessionRepository {
    private readonly session: Session;
    private readonly failOnUpdate: boolean;

    constructor(session: Session, failOnUpdate = false) {
        this.session = session;
        this.failOnUpdate = failOnUpdate;
    }

    async create() {
        return ok(undefined);
    }

    async findByRefreshTokenHash() {
        return ok(this.session);
    }

    async update() {
        if (this.failOnUpdate) {
            return fail(new PortError('SessionRepository', 'Database write failed'));
        }
        return ok(undefined);
    }

    async revokeByUserId() {
        return ok(undefined);
    }
}

class RefreshTokenHasherFailOnSecondCall implements RefreshTokenHasher {
    private callCount = 0;

    hash(value: string) {
        this.callCount++;
        if (this.callCount > 1) {
            return fail(new PortError('RefreshTokenHasher', 'Hashing service unavailable'));
        }
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
    const tokenService = new TokenServiceStub({ incrementalRefreshTokens: true });

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
        dateProvider: new DateProviderStub(fixedNow),
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
const baseRequest = { refreshToken: validRefreshTokenValue };

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
        overrides,
    });

describe('RefreshAccessTokenUseCase', () => {
    it('issues a new access token when refresh token is valid', async () => {
        const session = createSession();
        const { useCase, auditLogger, tokenService, sessionRepository } = createUseCase();
        sessionRepository.session = session;

        const result = await useCase.execute(baseRequest);

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

        const result = await useCase.execute(baseRequest);

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

        const result = await useCase.execute(baseRequest);

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

        const result = await useCase.execute(baseRequest);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.accessToken).toBe('access-token');
            expect(result.value.refreshToken).toBe('refresh-token-1');
        }
        expect(sessionRepository.updated).not.toBeNull();
        expect(sessionRepository.updated?.refreshTokenHash).toBe('hashed:refresh-token-1');
        expect(auditLogger.events.some((event) => event.action === 'REFRESH_SUCCESS')).toBe(true);
    });

    describe('PortError propagation', () => {
        it('propagates PortError when DateProvider.now fails', async () => {
            const { useCase } = createUseCase({
                dateProvider: new FailingDateProvider(),
            });

            const result = await useCase.execute(baseRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('DateProvider');
            }
        });

        it('propagates PortError when RefreshTokenHasher.hash fails', async () => {
            const { useCase } = createUseCase({
                refreshTokenHasher: new FailingRefreshTokenHasher(),
            });

            const result = await useCase.execute(baseRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('RefreshTokenHasher');
            }
        });

        it('propagates PortError when SessionRepository.findByRefreshTokenHash fails', async () => {
            const { useCase } = createUseCase({
                sessionRepository: new FailingSessionRepositoryOnMethod('findByRefreshTokenHash'),
            });

            const result = await useCase.execute(baseRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('SessionRepository');
            }
        });

        it('propagates PortError when AuditLogger.log fails during session-not-found logging', async () => {
            const { useCase, sessionRepository } = createUseCase({
                auditLogger: new FailingAuditLogger(),
            });
            sessionRepository.session = null;

            const result = await useCase.execute(baseRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('AuditLogger');
            }
        });

        it('propagates PortError when UserRepository.findById fails', async () => {
            const session = createSession();
            const { useCase, sessionRepository } = createUseCase({
                userRepository: buildFailingUserRepository(),
            });
            sessionRepository.session = session;

            const result = await useCase.execute(baseRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('UserRepository');
            }
        });

        it('propagates PortError when AuditLogger.log fails during user-not-found logging', async () => {
            const session = createSession();
            const { useCase, sessionRepository } = createUseCase({
                userRepository: {
                    findByEmail: async () => ok(null),
                    findById: async () => ok(null),
                    create: async () => ok(undefined),
                    list: async () => ok({ items: [], total: 0 }),
                    update: async () => ok(undefined),
                },
                auditLogger: new FailingAuditLogger(),
            });
            sessionRepository.session = session;

            const result = await useCase.execute(baseRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('AuditLogger');
            }
        });

        it('propagates PortError when TokenService.createAccessToken fails', async () => {
            const session = createSession();
            const { useCase, sessionRepository } = createUseCase({
                tokenService: new FailingTokenServiceOnMethod('createAccessToken'),
            });
            sessionRepository.session = session;

            const result = await useCase.execute(baseRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('TokenService');
            }
        });

        it('propagates PortError when TokenService.createRefreshToken fails during rotation', async () => {
            const session = createSession();
            const { useCase, sessionRepository } = createUseCase({
                tokenService: new FailingTokenServiceOnMethod('createRefreshToken'),
                rotateRefreshTokens: true,
            });
            sessionRepository.session = session;

            const result = await useCase.execute(baseRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('TokenService');
            }
        });

        it('propagates PortError when RefreshTokenHasher.hash fails during rotation', async () => {
            const session = createSession();
            const { useCase } = createUseCase({
                sessionRepository: new SessionRepositoryWithSession(session),
                refreshTokenHasher: new RefreshTokenHasherFailOnSecondCall(),
                rotateRefreshTokens: true,
            });

            const result = await useCase.execute(baseRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('RefreshTokenHasher');
            }
        });

        it('propagates PortError when SessionRepository.update fails during rotation', async () => {
            const session = createSession();
            const { useCase } = createUseCase({
                sessionRepository: new SessionRepositoryWithSession(session, true),
                rotateRefreshTokens: true,
            });

            const result = await useCase.execute(baseRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('SessionRepository');
            }
        });

        it('propagates PortError when AuditLogger.log fails during success logging', async () => {
            const session = createSession();
            const { useCase, sessionRepository } = createUseCase({
                auditLogger: new FailingAuditLogger(),
            });
            sessionRepository.session = session;

            const result = await useCase.execute(baseRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('AuditLogger');
            }
        });
    });
});
