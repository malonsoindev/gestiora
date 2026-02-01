import { ok, type Result } from '../../../shared/result.js';
import { PortError } from '../../../application/errors/port.error.js';
import type { AuditEvent, AuditLogger } from '../../../application/ports/audit-logger.js';

export class InMemoryAuditLogger implements AuditLogger {
    private readonly events: AuditEvent[] = [];

    async log(event: AuditEvent): Promise<Result<void, PortError>> {
        this.events.push(event);
        return ok(undefined);
    }

    getEvents(): AuditEvent[] {
        return [...this.events];
    }
}
