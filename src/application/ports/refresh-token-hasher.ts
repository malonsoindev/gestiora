import type { Result } from '@shared/result.js';
import type { PortError } from '@application/errors/port.error.js';

export interface RefreshTokenHasher {
    hash(value: string): Result<string, PortError>;
}
