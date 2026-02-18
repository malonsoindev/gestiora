import { describe, expect, it } from 'vitest';
import { LogoutUserUseCase } from '@application/use-cases/logout-user.use-case.js';
import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { RefreshTokenHasher } from '@application/ports/refresh-token-hasher.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { SessionRepository } from '@application/ports/session.repository.js';
import { PortError } from '@application/errors/port.error.js';
import { SessionStatus } from '@domain/entities/session.entity.js';
import type { SessionProps } from '@domain/entities/session.entity.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import { SessionRepositorySpy } from '@tests/shared/spies/session-repository.spy.js';
import { RefreshTokenHasherStub } from '@tests/shared/stubs/refresh-token-hasher.stub.js';
import { fixedNow } from '@tests/shared/fixed-now.js';
import { createTestSession } from '@tests/shared/fixtures/session.fixture.js';
import {
    FailingDateProvider,
    FailingAuditLogger,
    FailingRefreshTokenHasher,
    FailingSessionRepositoryOnMethod,
} from '@tests/shared/stubs/failing-stubs.js';

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

const createSession = (overrides: Partial<Omit<SessionProps, 'id' | 'userId' | 'refreshTokenHash'>> = {}) =>
    createTestSession({
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'hashed:refresh-token',
        now: fixedNow,
        overrides,
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
            const activeSession = createSession();
            const { useCase } = createUseCase({
                sessionRepository: new FailingSessionRepositoryOnMethod('update', {
                    sessionToReturn: activeSession,
                }),
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
