import { describe, expect, it } from 'vitest';
import { LogoutUserUseCase } from '../../../src/application/use-cases/logout-user.use-case.js';
import type { AuditEvent, AuditLogger } from '../../../src/application/ports/audit-logger.js';
import type { DateProvider } from '../../../src/application/ports/date-provider.js';
import type { RefreshTokenHasher } from '../../../src/application/ports/refresh-token-hasher.js';
import type { SessionRepository } from '../../../src/application/ports/session.repository.js';
import { Session, SessionStatus } from '../../../src/domain/entities/session.entity.js';
import type { SessionProps } from '../../../src/domain/entities/session.entity.js';
import { ok } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-01-29T15:00:00.000Z');

class FixedDateProvider implements DateProvider {
    constructor(private readonly date: Date) {}

    now() {
        return ok(this.date);
    }
}

class SessionRepositorySpy implements SessionRepository {
    updated: Session | null = null;
    session: Session | null = null;

    async create(session: Session) {
        void session;
        return ok(undefined);
    }

    async findByRefreshTokenHash(hash: string) {
        void hash;
        return ok(this.session);
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

class RefreshTokenHasherStub implements RefreshTokenHasher {
    hash(value: string) {
        return ok(`hashed:${value}`);
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
        dateProvider: new FixedDateProvider(fixedNow),
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
});
