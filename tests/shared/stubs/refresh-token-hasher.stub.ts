import type { RefreshTokenHasher } from '@application/ports/refresh-token-hasher.js';
import { ok } from '@shared/result.js';

/**
 * Stub for RefreshTokenHasher port.
 * Always returns a predictable hash: `hashed:{value}`
 */
export class RefreshTokenHasherStub implements RefreshTokenHasher {
    hash(value: string) {
        return ok(`hashed:${value}`);
    }
}
