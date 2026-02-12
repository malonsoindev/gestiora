import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { TokenService } from '@application/ports/token.service.js';
import type { AuthorizeRequest } from '@application/dto/authorize-request.request.js';
import type { AuthorizeResponse } from '@application/dto/authorize-request.response.js';
import type { PortError } from '@application/errors/port.error.js';
import { AuthorizationError } from '@application/errors/authorization.error.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { fail, ok, type Result } from '@shared/result.js';

export type AuthorizeRequestDependencies = {
    tokenService: TokenService;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
};

export type AuthorizeRequestError = AuthorizationError | PortError;

export class AuthorizeRequestUseCase {
    constructor(private readonly dependencies: AuthorizeRequestDependencies) {}

    async execute(
        request: AuthorizeRequest,
    ): Promise<Result<AuthorizeResponse, AuthorizeRequestError>> {
        if (!request.token) {
            const logResult = await this.logAccessDenied();
            if (!logResult.success) {
                return fail(logResult.error);
            }
            return fail(new AuthorizationError('Missing access token', 'UNAUTHENTICATED'));
        }

        const tokenResult = this.dependencies.tokenService.verifyAccessToken(request.token);
        if (!tokenResult.success) {
            const logResult = await this.logAccessDenied();
            if (!logResult.success) {
                return fail(logResult.error);
            }
            return fail(new AuthorizationError('Invalid access token', 'UNAUTHENTICATED'));
        }

        const principal = tokenResult.value;

        if (request.requiresAdmin && !this.hasAdminRole(principal.roles)) {
            const logResult = await this.logAccessDenied(principal.userId);
            if (!logResult.success) {
                return fail(logResult.error);
            }
            return fail(new AuthorizationError('Insufficient role', 'FORBIDDEN'));
        }

        return ok(principal);
    }

    private hasAdminRole(roles: UserRole[]): boolean {
        return roles.some((role) => role.getValue() === 'ADMIN');
    }

    private async logAccessDenied(userId?: string): Promise<Result<void, PortError>> {
        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }
        const auditResult = await this.dependencies.auditLogger.log({
            action: 'ACCESS_DENIED',
            ...(userId ? { actorUserId: userId, targetUserId: userId } : {}),
            metadata: {},
            createdAt: nowResult.value,
        });
        if (!auditResult.success) {
            return fail(auditResult.error);
        }
        return ok(undefined);
    }
}
