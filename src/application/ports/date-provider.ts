import type { Result } from '@shared/result.js';
import type { PortError } from '@application/errors/port.error.js';

export interface DateProvider {
    now(): Result<Date, PortError>;
}
