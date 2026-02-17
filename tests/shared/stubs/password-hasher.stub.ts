import type { PasswordHasher } from '@application/ports/password-hasher.js';
import { ok, type Result } from '@shared/result.js';
import type { PortError } from '@application/errors/port.error.js';

/**
 * Stub for PasswordHasher port.
 *
 * @param verifyResult - The result that `verify()` will return (default: true)
 *
 * @example
 * // Password verification succeeds
 * new PasswordHasherStub()
 *
 * @example
 * // Password verification fails
 * new PasswordHasherStub(false)
 */
export class PasswordHasherStub implements PasswordHasher {
    constructor(private readonly verifyResult: boolean = true) {}

    async verify(_plainText: string, _hash: string): Promise<Result<boolean, PortError>> {
        return ok(this.verifyResult);
    }

    async hash(value: string): Promise<Result<string, PortError>> {
        return ok(`hashed:${value}`);
    }
}
