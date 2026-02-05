import bcrypt from 'bcrypt';
import { fail, ok, type Result } from '../../shared/result.js';
import { PortError } from '../../application/errors/port.error.js';
import type { PasswordHasher } from '../../application/ports/password-hasher.js';

export class BcryptPasswordHasher implements PasswordHasher {
    constructor(private readonly saltRounds: number = 12) {}

    async verify(plainText: string, hash: string): Promise<Result<boolean, PortError>> {
        try {
            const match = await bcrypt.compare(plainText, hash);
            return ok(match);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('PasswordHasher', 'Failed to verify password', cause));
        }
    }

    async hash(plainText: string): Promise<Result<string, PortError>> {
        try {
            const hashed = await bcrypt.hash(plainText, this.saltRounds);
            return ok(hashed);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('PasswordHasher', 'Failed to hash password', cause));
        }
    }
}
