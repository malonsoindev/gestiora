import type { DateProvider } from '@application/ports/date-provider.js';
import type { PortError } from '@application/errors/port.error.js';
import { ok, type Result } from '@shared/result.js';

export class DateProviderStub implements DateProvider {
    constructor(private readonly fixedNow: Date) {}

    now(): Result<Date, PortError> {
        return ok(this.fixedNow);
    }
}
