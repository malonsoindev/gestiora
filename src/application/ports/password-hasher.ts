import type { Result } from '../../shared/result.js';
import type { PortError } from '../errors/port.error.js';

export interface PasswordHasher {
    verify(plainText: string, hash: string): Promise<Result<boolean, PortError>>;
    hash(plainText: string): Promise<Result<string, PortError>>;
}
