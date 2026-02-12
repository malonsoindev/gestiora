import type { DateProvider } from '../../../src/application/ports/date-provider.js';
import type { PortError } from '../../../src/application/errors/port.error.js';
import { ok, type Result } from '../../../src/shared/result.js';

export class DateProviderStub implements DateProvider {
    constructor(private readonly fixedNow: Date) {}

    now(): Result<Date, PortError> {
        return ok(this.fixedNow);
    }
}
