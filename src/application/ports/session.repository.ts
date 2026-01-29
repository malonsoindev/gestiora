import { Session } from '../../domain/entities/session.entity.js';

export interface SessionRepository {
    create(session: Session): Promise<void>;
    findByRefreshTokenHash(hash: string): Promise<Session | null>;
    update(session: Session): Promise<void>;
}
