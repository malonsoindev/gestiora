import { User } from '../../domain/entities/user.entity.js';
import type { Result } from '../../shared/result.js';
import type { PortError } from '../errors/port.error.js';

export interface UserRepository {
    findByEmail(email: string): Promise<Result<User | null, PortError>>;
    findById(id: string): Promise<Result<User | null, PortError>>;
    create(user: User): Promise<Result<void, PortError>>;
}
