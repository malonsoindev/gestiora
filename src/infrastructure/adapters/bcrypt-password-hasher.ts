import bcrypt from 'bcrypt';
import { ok, type Result } from '../../shared/result.js';
import { PortError } from '../../application/errors/port.error.js';
import type { PasswordHasher } from '../../application/ports/password-hasher.js';

export class BcryptPasswordHasher implements PasswordHasher {
    constructor(private readonly saltRounds: number = 12) {}

    async verify(plainText: string, hash: string): Promise<Result<boolean, PortError>> {
        try {
            const match = await bcrypt.compare(plainText, hash);
            return ok(match);
        } catch (error) {
            return ok(false);
        }
    }
}
