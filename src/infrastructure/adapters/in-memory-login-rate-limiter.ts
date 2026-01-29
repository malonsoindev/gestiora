import { fail, ok, type Result } from '../../shared/result.js';
import { PortError } from '../../application/errors/port.error.js';
import type { LoginRateLimiter } from '../../application/ports/login-rate-limiter.js';
import type { LoginAttemptRepository } from '../../application/ports/login-attempt.repository.js';
import { AuthRateLimitedError } from '../../domain/errors/auth-rate-limited.error.js';

export class InMemoryLoginRateLimiter implements LoginRateLimiter {
    constructor(
        private readonly loginAttemptRepository: LoginAttemptRepository,
        private readonly maxAttempts: number,
        private readonly windowMinutes: number,
    ) {}

    async assertAllowed(
        email: string,
        ip?: string,
    ): Promise<Result<void, AuthRateLimitedError | PortError>> {
        const attemptsResult = await this.loginAttemptRepository.countFailedAttempts(
            {
                email,
                ...(ip ? { ip } : {}),
            },
            this.windowMinutes,
        );

        if (!attemptsResult.success) {
            return fail(attemptsResult.error);
        }

        if (attemptsResult.value >= this.maxAttempts) {
            return fail(new AuthRateLimitedError());
        }

        return ok(undefined);
    }
}
