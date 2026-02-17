import { describe, expect, it } from 'vitest';
import { AntiBruteForceUseCase } from '@application/use-cases/anti-brute-force.use-case.js';
import type { LoginAttemptRepository, LoginAttemptKey } from '@application/ports/login-attempt.repository.js';
import type { AuditLogger, AuditEvent } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import { PortError } from '@application/errors/port.error.js';
import { AuthRateLimitedError } from '@domain/errors/auth-rate-limited.error.js';
import { ok, fail, type Result } from '@shared/result.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import {
    FailingDateProvider,
    FailingAuditLogger,
} from '@tests/shared/stubs/failing-stubs.js';

class LoginAttemptRepositoryStub implements LoginAttemptRepository {
    attemptsInWindow = 0;

    async countFailedAttempts() {
        return ok(this.attemptsInWindow);
    }

    async recordAttempt() {
        return ok(undefined);
    }
}

// Local stub with conditional failure logic (not suitable for centralized failing-stubs)
class FailingLoginAttemptRepositoryOnMethod implements LoginAttemptRepository {
    constructor(
        private readonly failOn: 'countFailedAttempts' | 'recordAttempt',
        private readonly attemptsInWindow = 0,
    ) {}

    async countFailedAttempts(_key: LoginAttemptKey, _windowMinutes: number): Promise<Result<number, PortError>> {
        if (this.failOn === 'countFailedAttempts') {
            return fail(new PortError('LoginAttemptRepository', 'Database read error'));
        }
        return ok(this.attemptsInWindow);
    }

    async recordAttempt(_key: LoginAttemptKey, _succeeded: boolean, _timestamp: Date): Promise<Result<void, PortError>> {
        if (this.failOn === 'recordAttempt') {
            return fail(new PortError('LoginAttemptRepository', 'Database write error'));
        }
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
            dateProvider: new DateProviderStub(new Date('2026-01-29T18:00:00.000Z')),
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
            dateProvider: new DateProviderStub(new Date('2026-01-29T18:00:00.000Z')),
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

    describe('PortError propagation', () => {
        const defaultConfig = {
            maxAttempts: 5,
            windowMinutes: 15,
            lockMinutes: 30,
        };

        it('propagates PortError when DateProvider.now fails', async () => {
            const useCase = new AntiBruteForceUseCase({
                loginAttemptRepository: new LoginAttemptRepositoryStub(),
                auditLogger: new AuditLoggerSpy(),
                dateProvider: new FailingDateProvider(),
                ...defaultConfig,
            });

            const result = await useCase.execute({ email: 'user@example.com', ip: TEST_IP });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('DateProvider');
            }
        });

        it('propagates PortError when LoginAttemptRepository.countFailedAttempts fails', async () => {
            const useCase = new AntiBruteForceUseCase({
                loginAttemptRepository: new FailingLoginAttemptRepositoryOnMethod('countFailedAttempts'),
                auditLogger: new AuditLoggerSpy(),
                dateProvider: new DateProviderStub(new Date('2026-01-29T18:00:00.000Z')),
                ...defaultConfig,
            });

            const result = await useCase.execute({ email: 'user@example.com', ip: TEST_IP });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('LoginAttemptRepository');
            }
        });

        it('propagates PortError when AuditLogger.log fails during rate limit', async () => {
            // Need attemptsInWindow >= maxAttempts to trigger audit log
            const useCase = new AntiBruteForceUseCase({
                loginAttemptRepository: new FailingLoginAttemptRepositoryOnMethod('recordAttempt', 5),
                auditLogger: new FailingAuditLogger(),
                dateProvider: new DateProviderStub(new Date('2026-01-29T18:00:00.000Z')),
                ...defaultConfig,
            });

            const result = await useCase.execute({ email: 'user@example.com', ip: TEST_IP });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('AuditLogger');
            }
        });

        it('propagates PortError when LoginAttemptRepository.recordAttempt fails', async () => {
            const useCase = new AntiBruteForceUseCase({
                loginAttemptRepository: new FailingLoginAttemptRepositoryOnMethod('recordAttempt', 0),
                auditLogger: new AuditLoggerSpy(),
                dateProvider: new DateProviderStub(new Date('2026-01-29T18:00:00.000Z')),
                ...defaultConfig,
            });

            const result = await useCase.execute({ email: 'user@example.com', ip: TEST_IP });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('LoginAttemptRepository');
            }
        });
    });
});
