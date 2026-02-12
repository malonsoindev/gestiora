import type { Result } from '@shared/result.js';
import type { PortError } from '@application/errors/port.error.js';
import { AuthRateLimitedError } from '@domain/errors/auth-rate-limited.error.js';

export interface LoginRateLimiter {
    assertAllowed(email: string, ip?: string): Promise<Result<void, AuthRateLimitedError | PortError>>;
}
