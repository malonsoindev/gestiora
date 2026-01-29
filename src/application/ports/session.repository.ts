import { Session } from '../../domain/entities/session.entity.js';
import type { Result } from '../../shared/result.js';
import type { PortError } from '../errors/port.error.js';

export interface SessionRepository {
    create(session: Session): Promise<Result<void, PortError>>;
    findByRefreshTokenHash(hash: string): Promise<Result<Session | null, PortError>>;
    update(session: Session): Promise<Result<void, PortError>>;
}
