import { User } from '../../domain/entities/user.entity.js';

export interface UserRepository {
    findByEmail(email: string): Promise<User | null>;
}
