import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { LoginAttemptRepository } from '@application/ports/login-attempt.repository.js';
import type { AntiBruteForceRequest } from '@application/dto/anti-brute-force.request.js';
import type { PortError } from '@application/errors/port.error.js';
import { AuthRateLimitedError } from '@domain/errors/auth-rate-limited.error.js';
import { fail, ok, type Result } from '@shared/result.js';

export type AntiBruteForceDependencies = {
    loginAttemptRepository: LoginAttemptRepository;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
    maxAttempts: number;
    windowMinutes: number;
    lockMinutes: number;
};

export type AntiBruteForceError = AuthRateLimitedError | PortError;

export class AntiBruteForceUseCase {
    constructor(private readonly dependencies: AntiBruteForceDependencies) {}

    async execute(request: AntiBruteForceRequest): Promise<Result<void, AntiBruteForceError>> {
        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }
        const now = nowResult.value;

        const attemptKey = {
            email: request.email,
            ...(request.ip ? { ip: request.ip } : {}),
        };

        const countResult = await this.dependencies.loginAttemptRepository.countFailedAttempts(
            attemptKey,
            this.dependencies.windowMinutes,
        );

        if (!countResult.success) {
            return fail(countResult.error);
        }

        if (countResult.value >= this.dependencies.maxAttempts) {
            const auditResult = await this.dependencies.auditLogger.log({
                action: 'USER_LOCKED',
                metadata: {
                    email: request.email,
                    ip: request.ip,
                    windowMinutes: this.dependencies.windowMinutes,
                    lockMinutes: this.dependencies.lockMinutes,
                },
                createdAt: now,
            });
            if (!auditResult.success) {
                return fail(auditResult.error);
            }

            return fail(new AuthRateLimitedError());
        }

        const recordResult = await this.dependencies.loginAttemptRepository.recordAttempt(
            attemptKey,
            false,
            now,
        );
        if (!recordResult.success) {
            return fail(recordResult.error);
        }

        return ok(undefined);
    }
}
