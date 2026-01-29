import type { Result } from '../../shared/result.js';
import type { PortError } from '../errors/port.error.js';

export type AuditEvent = {
    action: string;
    actorUserId?: string;
    targetUserId?: string;
    metadata?: Record<string, string | number | boolean | null | undefined>;
    createdAt: Date;
};

export interface AuditLogger {
    log(event: AuditEvent): Promise<Result<void, PortError>>;
}
