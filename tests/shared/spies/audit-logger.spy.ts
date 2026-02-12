import type { AuditEvent, AuditLogger } from '@application/ports/audit-logger.js';
import { ok } from '@shared/result.js';

export class AuditLoggerSpy implements AuditLogger {
    events: AuditEvent[] = [];

    async log(event: AuditEvent) {
        this.events.push(event);
        return ok(undefined);
    }
}
