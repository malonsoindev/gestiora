import { describe, expect, it } from 'vitest';
import { AuthorizeRequestUseCase } from '@application/use-cases/authorize-request.use-case.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { TokenServiceStub } from '@tests/shared/stubs/token-service.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';

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
});
