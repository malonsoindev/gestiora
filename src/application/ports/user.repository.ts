import { User } from '../../domain/entities/user.entity.js';

export interface UserRepository {
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
}
