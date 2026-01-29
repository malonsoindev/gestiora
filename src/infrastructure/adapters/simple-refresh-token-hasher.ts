import { ok, type Result } from '../../shared/result.js';
import { PortError } from '../../application/errors/port.error.js';
import type { RefreshTokenHasher } from '../../application/ports/refresh-token-hasher.js';

export class SimpleRefreshTokenHasher implements RefreshTokenHasher {
    hash(value: string): Result<string, PortError> {
        return ok(value.split('').reverse().join(''));
    }
}
