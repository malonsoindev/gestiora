import { describe, expect, it } from 'vitest';
import { LogoutUserUseCase } from '@application/use-cases/logout-user.use-case.js';
import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { RefreshTokenHasher } from '@application/ports/refresh-token-hasher.js';
import type { SessionRepository } from '@application/ports/session.repository.js';
import { PortError } from '@application/errors/port.error.js';
import { Session, SessionStatus } from '@domain/entities/session.entity.js';
import type { SessionProps } from '@domain/entities/session.entity.js';
import { ok, fail, type Result } from '@shared/result.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import {
    FailingDateProvider,
    FailingAuditLogger,
    FailingRefreshTokenHasher,
} from '@tests/shared/stubs/failing-stubs.js';

const fixedNow = new Date('2026-01-29T15:00:00.000Z');

class SessionRepositorySpy implements SessionRepository {
    updated: Session | null = null;
    session: Session | null = null;

    async create(_session: Session) {
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

// Local stub with conditional failure logic (not suitable for centralized failing-stubs)
class FailingSessionRepositoryOnMethod implements SessionRepository {
    constructor(private readonly failOn: 'findByRefreshTokenHash' | 'update') {}

    async create(_session: Session): Promise<Result<void, PortError>> {
        return ok(undefined);
    }

    async findByRefreshTokenHash(_hash: string): Promise<Result<Session | null, PortError>> {
        if (this.failOn === 'findByRefreshTokenHash') {
            return fail(new PortError('SessionRepository', 'Database read error'));
        }
        // Return an active session so update() gets called
        return ok(Session.create({
            id: 'session-1',
            userId: 'user-1',
            refreshTokenHash: 'hashed:refresh-token',
            status: SessionStatus.Active,
            createdAt: new Date(),
            lastUsedAt: new Date(),
            expiresAt: new Date('2026-02-28T12:00:00.000Z'),
        }));
    }

    async update(_session: Session): Promise<Result<void, PortError>> {
        if (this.failOn === 'update') {
            return fail(new PortError('SessionRepository', 'Database write error'));
        }
        return ok(undefined);
    }

    async revokeByUserId(_userId: string): Promise<Result<void, PortError>> {
        return ok(undefined);
    }
}

type UseCaseDependencies = {
    sessionRepository: SessionRepository;
    refreshTokenHasher: RefreshTokenHasher;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
};

const createUseCase = (dependencies: Partial<UseCaseDependencies> = {}): {
    useCase: LogoutUserUseCase;
    sessionRepository: SessionRepositorySpy;
    auditLogger: AuditLoggerSpy;
} => {
    const sessionRepository = new SessionRepositorySpy();
    const auditLogger = new AuditLoggerSpy();

    const resolvedDependencies: UseCaseDependencies = {
        sessionRepository,
        refreshTokenHasher: new RefreshTokenHasherStub(),
        auditLogger,
        dateProvider: new DateProviderStub(fixedNow),
        ...dependencies,
    };

    return {
        useCase: new LogoutUserUseCase(resolvedDependencies),
        sessionRepository,
        auditLogger,
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

describe('LogoutUserUseCase', () => {
    it('revokes an active session and logs audit event', async () => {
        const session = createSession();
        const { useCase, auditLogger, sessionRepository } = createUseCase();
        sessionRepository.session = session;

        const result = await useCase.execute({ refreshToken: 'refresh-token' });

        expect(result.success).toBe(true);
        expect(sessionRepository.updated).not.toBeNull();
        expect(sessionRepository.updated?.status).toBe(SessionStatus.Revoked);
        expect(auditLogger.events.some((event) => event.action === 'LOGOUT')).toBe(true);
    });

    it('returns ok when refresh token is not found (idempotent)', async () => {
        const { useCase, auditLogger, sessionRepository } = createUseCase();
        sessionRepository.session = null;

        const result = await useCase.execute({ refreshToken: 'missing' });

        expect(result.success).toBe(true);
        expect(sessionRepository.updated).toBeNull();
        expect(auditLogger.events.some((event) => event.action === 'LOGOUT')).toBe(true);
    });

    it('returns ok when session is already revoked', async () => {
        const session = createSession({ status: SessionStatus.Revoked });
        const { useCase, auditLogger, sessionRepository } = createUseCase();
        sessionRepository.session = session;

        const result = await useCase.execute({ refreshToken: 'refresh-token' });

        expect(result.success).toBe(true);
        expect(sessionRepository.updated).toBeNull();
        expect(auditLogger.events.some((event) => event.action === 'LOGOUT')).toBe(true);
    });

    describe('PortError propagation', () => {
        it('propagates PortError when DateProvider.now fails', async () => {
            const { useCase } = createUseCase({ dateProvider: new FailingDateProvider() });

            const result = await useCase.execute({ refreshToken: 'refresh-token' });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect(result.error.port).toBe('DateProvider');
            }
        });

        it('propagates PortError when RefreshTokenHasher.hash fails', async () => {
            const { useCase } = createUseCase({ refreshTokenHasher: new FailingRefreshTokenHasher() });

            const result = await useCase.execute({ refreshToken: 'refresh-token' });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect(result.error.port).toBe('RefreshTokenHasher');
            }
        });

        it('propagates PortError when SessionRepository.findByRefreshTokenHash fails', async () => {
            const { useCase } = createUseCase({
                sessionRepository: new FailingSessionRepositoryOnMethod('findByRefreshTokenHash'),
            });

            const result = await useCase.execute({ refreshToken: 'refresh-token' });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect(result.error.port).toBe('SessionRepository');
            }
        });

        it('propagates PortError when SessionRepository.update fails', async () => {
            const { useCase } = createUseCase({
                sessionRepository: new FailingSessionRepositoryOnMethod('update'),
            });

            const result = await useCase.execute({ refreshToken: 'refresh-token' });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect(result.error.port).toBe('SessionRepository');
            }
        });

        it('propagates PortError when AuditLogger.log fails', async () => {
            const { useCase } = createUseCase({ auditLogger: new FailingAuditLogger() });

            const result = await useCase.execute({ refreshToken: 'refresh-token' });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect(result.error.port).toBe('AuditLogger');
            }
        });
    });
});
