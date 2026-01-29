import type { Result } from '../../shared/result.js';
import type { PortError } from '../errors/port.error.js';

export type LoginAttemptKey = {
    email: string;
    ip?: string;
};

export interface LoginAttemptRepository {
    countFailedAttempts(key: LoginAttemptKey, windowMinutes: number): Promise<Result<number, PortError>>;
    recordAttempt(key: LoginAttemptKey, succeeded: boolean, timestamp: Date): Promise<Result<void, PortError>>;
}
