import { describe, expect, it } from 'vitest';
import { AuthorizeRequestUseCase } from '@application/use-cases/authorize-request.use-case.js';
import type { TokenService, AccessTokenPayload } from '@application/ports/token.service.js';
import type { AuditEvent, AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import { PortError } from '@application/errors/port.error.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { fail, ok } from '@shared/result.js';

class FixedDateProvider implements DateProvider {
    constructor(private readonly date: Date) {}

    now() {
        return ok(this.date);
    }
}

class TokenServiceStub implements TokenService {
    accessPayloads: AccessTokenPayload[] = [];

    createAccessToken() {
        return ok('token');
    }

    createRefreshToken() {
        return ok('refresh');
    }

    verifyAccessToken(token: string) {
        if (token === 'invalid') {
            return fail(new PortError('TokenService', 'invalid'));
        }

        return ok({
            userId: 'user-1',
            roles: [UserRole.user()],
        });
    }
}

class AuditLoggerSpy implements AuditLogger {
    events: AuditEvent[] = [];

    async log(event: AuditEvent) {
        this.events.push(event);
        return ok(undefined);
    }
}

describe('AuthorizeRequestUseCase', () => {
    it('rejects requests without token', async () => {
        const useCase = new AuthorizeRequestUseCase({
            tokenService: new TokenServiceStub(),
            auditLogger: new AuditLoggerSpy(),
            dateProvider: new FixedDateProvider(new Date('2026-01-29T16:00:00.000Z')),
        });

        const result = await useCase.execute({ token: undefined, requiresAdmin: false });

        expect(result.success).toBe(false);
    });

    it('rejects invalid tokens', async () => {
        const useCase = new AuthorizeRequestUseCase({
            tokenService: new TokenServiceStub(),
            auditLogger: new AuditLoggerSpy(),
            dateProvider: new FixedDateProvider(new Date('2026-01-29T16:00:00.000Z')),
        });

        const result = await useCase.execute({ token: 'invalid', requiresAdmin: false });

        expect(result.success).toBe(false);
    });

    it('allows valid tokens', async () => {
        const useCase = new AuthorizeRequestUseCase({
            tokenService: new TokenServiceStub(),
            auditLogger: new AuditLoggerSpy(),
            dateProvider: new FixedDateProvider(new Date('2026-01-29T16:00:00.000Z')),
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
            tokenService: new TokenServiceStub(),
            auditLogger: new AuditLoggerSpy(),
            dateProvider: new FixedDateProvider(new Date('2026-01-29T16:00:00.000Z')),
        });

        const result = await useCase.execute({ token: 'valid', requiresAdmin: true });

        expect(result.success).toBe(false);
    });

    it('allows admin role for admin endpoints', async () => {
        const tokenService = new TokenServiceStub();
        tokenService.verifyAccessToken = () =>
            ok({
                userId: 'admin-1',
                roles: [UserRole.admin()],
            });

        const useCase = new AuthorizeRequestUseCase({
            tokenService,
            auditLogger: new AuditLoggerSpy(),
            dateProvider: new FixedDateProvider(new Date('2026-01-29T16:00:00.000Z')),
        });

        const result = await useCase.execute({ token: 'admin-token', requiresAdmin: true });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.userId).toBe('admin-1');
            expect(result.value.roles[0]?.getValue()).toBe('ADMIN');
        }
    });
});
