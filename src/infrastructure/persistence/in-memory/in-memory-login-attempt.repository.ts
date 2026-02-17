import { ok, type Result } from '@shared/result.js';
import { PortError } from '@application/errors/port.error.js';
import type { LoginAttemptKey, LoginAttemptRepository } from '@application/ports/login-attempt.repository.js';

type LoginAttempt = {
    email: string;
    ip?: string;
    succeeded: boolean;
    timestamp: Date;
};

export class InMemoryLoginAttemptRepository implements LoginAttemptRepository {
    private attempts: LoginAttempt[] = [];

    async countFailedAttempts(
        key: LoginAttemptKey,
        windowMinutes: number,
    ): Promise<Result<number, PortError>> {
        const windowStart = new Date(Date.now() - windowMinutes * 60_000);
        this.attempts = this.attempts.filter(
            (attempt) => attempt.timestamp.getTime() >= windowStart.getTime(),
        );

        const failedAttempts = this.attempts.filter((attempt) => {
            if (attempt.succeeded) {
                return false;
            }
            if (attempt.email !== key.email) {
                return false;
            }
            if (key.ip && attempt.ip !== key.ip) {
                return false;
            }
            return true;
        });

        return ok(failedAttempts.length);
    }

    async recordAttempt(
        key: LoginAttemptKey,
        succeeded: boolean,
        timestamp: Date,
    ): Promise<Result<void, PortError>> {
        this.attempts.push({
            email: key.email,
            succeeded,
            timestamp,
            ...(key.ip ? { ip: key.ip } : {}),
        });

        return ok(undefined);
    }

    /**
     * Clears all recorded login attempts.
     * Useful for testing purposes to reset rate limiting state.
     */
    clear(): void {
        this.attempts = [];
    }
}
