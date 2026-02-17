import { describe, expect, it } from 'vitest';
import { AuthorizeRequestUseCase } from '@application/use-cases/authorize-request.use-case.js';
import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import { PortError } from '@application/errors/port.error.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { fail, ok } from '@shared/result.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { TokenServiceStub } from '@tests/shared/stubs/token-service.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';

// ========== PortError Stubs ==========

class FailingDateProvider implements DateProvider {
    now() {
        return fail(new PortError('DateProvider', 'Clock service unavailable'));
    }
}

class FailingAuditLogger implements AuditLogger {
    async log() {
        return fail(new PortError('AuditLogger', 'Audit service unavailable'));
    }
}

describe('AuthorizeRequestUseCase', () => {
    it('rejects requests without token', async () => {
        const useCase = new AuthorizeRequestUseCase({
            tokenService: new TokenServiceStub({ invalidTokens: ['invalid'] }),
            auditLogger: new AuditLoggerSpy(),
            dateProvider: new DateProviderStub(new Date('2026-01-29T16:00:00.000Z')),
        });

        const result = await useCase.execute({ requiresAdmin: false });

        expect(result.success).toBe(false);
    });

    it('rejects invalid tokens', async () => {
        const useCase = new AuthorizeRequestUseCase({
            tokenService: new TokenServiceStub({ invalidTokens: ['invalid'] }),
            auditLogger: new AuditLoggerSpy(),
            dateProvider: new DateProviderStub(new Date('2026-01-29T16:00:00.000Z')),
        });

        const result = await useCase.execute({ token: 'invalid', requiresAdmin: false });

        expect(result.success).toBe(false);
    });

    it('allows valid tokens', async () => {
        const useCase = new AuthorizeRequestUseCase({
            tokenService: new TokenServiceStub({ invalidTokens: ['invalid'] }),
            auditLogger: new AuditLoggerSpy(),
            dateProvider: new DateProviderStub(new Date('2026-01-29T16:00:00.000Z')),
        });

        const result = await useCase.execute({ token: 'valid', requiresAdmin: false });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.userId).toBe('user-1');
            expect(result.value.roles).toHaveLength(1);
        }
    });

    it('rejects non-admin role for admin endpoints', async () => {
        const useCase = new AuthorizeRequestUseCase({
            tokenService: new TokenServiceStub({ invalidTokens: ['invalid'] }),
            auditLogger: new AuditLoggerSpy(),
            dateProvider: new DateProviderStub(new Date('2026-01-29T16:00:00.000Z')),
        });

        const result = await useCase.execute({ token: 'valid', requiresAdmin: true });

        expect(result.success).toBe(false);
    });

    it('allows admin role for admin endpoints', async () => {
        const tokenService = new TokenServiceStub({
            verifyPayload: {
                userId: 'admin-1',
                roles: [UserRole.admin()],
            },
        });

        const useCase = new AuthorizeRequestUseCase({
            tokenService,
            auditLogger: new AuditLoggerSpy(),
            dateProvider: new DateProviderStub(new Date('2026-01-29T16:00:00.000Z')),
        });

        const result = await useCase.execute({ token: 'admin-token', requiresAdmin: true });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.userId).toBe('admin-1');
            expect(result.value.roles[0]?.getValue()).toBe('ADMIN');
        }
    });

    describe('PortError propagation', () => {
        it('propagates PortError when DateProvider.now fails during missing token logging', async () => {
            const useCase = new AuthorizeRequestUseCase({
                tokenService: new TokenServiceStub({ invalidTokens: [] }),
                auditLogger: new AuditLoggerSpy(),
                dateProvider: new FailingDateProvider(),
            });

            const result = await useCase.execute({ requiresAdmin: false });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('DateProvider');
            }
        });

        it('propagates PortError when AuditLogger.log fails during missing token logging', async () => {
            const useCase = new AuthorizeRequestUseCase({
                tokenService: new TokenServiceStub({ invalidTokens: [] }),
                auditLogger: new FailingAuditLogger(),
                dateProvider: new DateProviderStub(new Date('2026-01-29T16:00:00.000Z')),
            });

            const result = await useCase.execute({ requiresAdmin: false });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('AuditLogger');
            }
        });

        it('propagates PortError when AuditLogger.log fails during invalid token logging', async () => {
            const useCase = new AuthorizeRequestUseCase({
                tokenService: new TokenServiceStub({ invalidTokens: ['invalid'] }),
                auditLogger: new FailingAuditLogger(),
                dateProvider: new DateProviderStub(new Date('2026-01-29T16:00:00.000Z')),
            });

            const result = await useCase.execute({ token: 'invalid', requiresAdmin: false });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('AuditLogger');
            }
        });

        it('propagates PortError when AuditLogger.log fails during insufficient role logging', async () => {
            const useCase = new AuthorizeRequestUseCase({
                tokenService: new TokenServiceStub({ invalidTokens: [] }),
                auditLogger: new FailingAuditLogger(),
                dateProvider: new DateProviderStub(new Date('2026-01-29T16:00:00.000Z')),
            });

            const result = await useCase.execute({ token: 'valid', requiresAdmin: true });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('AuditLogger');
            }
        });
    });
});
