import { ok, type Result } from '../../shared/result.js';
import { PortError } from '../../application/errors/port.error.js';
import type { PasswordHasher } from '../../application/ports/password-hasher.js';

export class PlainTextPasswordHasher implements PasswordHasher {
    async verify(plainText: string, hash: string): Promise<Result<boolean, PortError>> {
        return ok(plainText === hash);
    }
}
