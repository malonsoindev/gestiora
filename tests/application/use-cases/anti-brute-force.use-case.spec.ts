import { describe, expect, it } from 'vitest';
import { AntiBruteForceUseCase } from '@application/use-cases/anti-brute-force.use-case.js';
import type { LoginAttemptRepository } from '@application/ports/login-attempt.repository.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { AuditEvent, AuditLogger } from '@application/ports/audit-logger.js';
import { AuthRateLimitedError } from '@domain/errors/auth-rate-limited.error.js';
import { ok } from '@shared/result.js';

class FixedDateProvider implements DateProvider {
    constructor(private readonly date: Date) {}

    now() {
        return ok(this.date);
    }
}

class LoginAttemptRepositoryStub implements LoginAttemptRepository {
    attemptsInWindow = 0;

    async countFailedAttempts() {
        return ok(this.attemptsInWindow);
    }

    async recordAttempt() {
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

// TEST-NET-1 (RFC 5737) reserved for documentation/examples.
const TEST_IP = '192.0.2.1';

describe('AntiBruteForceUseCase', () => {
    it('allows login when attempts are below limit', async () => {
        const repo = new LoginAttemptRepositoryStub();
        repo.attemptsInWindow = 2;

        const useCase = new AntiBruteForceUseCase({
            loginAttemptRepository: repo,
            auditLogger: new AuditLoggerSpy(),
            dateProvider: new FixedDateProvider(new Date('2026-01-29T18:00:00.000Z')),
            maxAttempts: 5,
            windowMinutes: 15,
            lockMinutes: 30,
        });

        const result = await useCase.execute({ email: 'user@example.com', ip: TEST_IP });

        expect(result.success).toBe(true);
    });

    it('blocks login when attempts reach limit', async () => {
        const repo = new LoginAttemptRepositoryStub();
        repo.attemptsInWindow = 5;

        const auditLogger = new AuditLoggerSpy();
        const useCase = new AntiBruteForceUseCase({
            loginAttemptRepository: repo,
            auditLogger,
            dateProvider: new FixedDateProvider(new Date('2026-01-29T18:00:00.000Z')),
            maxAttempts: 5,
            windowMinutes: 15,
            lockMinutes: 30,
        });

        const result = await useCase.execute({ email: 'user@example.com', ip: TEST_IP });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(AuthRateLimitedError);
        }
        expect(auditLogger.events.some((event) => event.action === 'USER_LOCKED')).toBe(true);
    });
});
