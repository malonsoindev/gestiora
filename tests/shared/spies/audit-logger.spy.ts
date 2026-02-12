import type { AuditEvent, AuditLogger } from '../../../src/application/ports/audit-logger.js';
import { ok } from '../../../src/shared/result.js';

export class AuditLoggerSpy implements AuditLogger {
    events: AuditEvent[] = [];

    async log(event: AuditEvent) {
        this.events.push(event);
        return ok(undefined);
    }
}
