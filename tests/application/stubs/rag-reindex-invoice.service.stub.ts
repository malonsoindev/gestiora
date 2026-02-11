import { PortError } from '../../../src/application/errors/port.error.js';
import { ok, fail, type Result } from '../../../src/shared/result.js';

export class RagReindexInvoiceServiceStub {
    calledIds: string[] = [];
    private readonly shouldFail: boolean;

    constructor(shouldFail = false) {
        this.shouldFail = shouldFail;
    }

    async reindex(invoiceId: string): Promise<Result<void, PortError>> {
        if (this.shouldFail) {
            return fail(new PortError('RagIndexer', 'Reindex failed'));
        }
        this.calledIds.push(invoiceId);
        return ok(undefined);
    }
}
