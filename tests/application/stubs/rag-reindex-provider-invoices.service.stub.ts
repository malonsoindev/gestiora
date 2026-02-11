import { PortError } from '../../../src/application/errors/port.error.js';
import { ok, fail, type Result } from '../../../src/shared/result.js';

export class RagReindexProviderInvoicesServiceStub {
    calledIds: string[] = [];
    private readonly shouldFail: boolean;

    constructor(shouldFail = false) {
        this.shouldFail = shouldFail;
    }

    async reindexByProviderId(providerId: string): Promise<Result<void, PortError>> {
        if (this.shouldFail) {
            return fail(new PortError('RagIndexer', 'Reindex provider failed'));
        }
        this.calledIds.push(providerId);
        return ok(undefined);
    }
}
