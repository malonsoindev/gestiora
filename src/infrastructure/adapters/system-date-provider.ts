import { ok, type Result } from '../../shared/result.js';
import { PortError } from '../../application/errors/port.error.js';
import type { DateProvider } from '../../application/ports/date-provider.js';

export class SystemDateProvider implements DateProvider {
    now(): Result<Date, PortError> {
        return ok(new Date());
    }
}
