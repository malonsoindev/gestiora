import type { UpdateProviderStatusRequest } from '@application/dto/update-provider-status.request.js';
import type { ProviderRepository } from '@application/ports/provider.repository.js';
import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { PortError } from '@application/errors/port.error.js';
import type { RagReindexProviderInvoicesHandler } from '@application/services/rag-reindex-provider-invoices.service.js';
import { ProviderNotFoundError } from '@domain/errors/provider-not-found.error.js';
import { InvalidProviderStatusError } from '@domain/errors/invalid-provider-status.error.js';
import { ProviderStatus } from '@domain/entities/provider.entity.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import { ok, fail, type Result } from '@shared/result.js';

export type UpdateProviderStatusDependencies = {
    providerRepository: ProviderRepository;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
    ragReindexProviderInvoicesService: RagReindexProviderInvoicesHandler;
};

export type UpdateProviderStatusError =
    | ProviderNotFoundError
    | InvalidProviderStatusError
    | InvoiceNotFoundError
    | PortError;

export class UpdateProviderStatusUseCase {
    constructor(private readonly dependencies: UpdateProviderStatusDependencies) {}

    async execute(
        request: UpdateProviderStatusRequest,
    ): Promise<Result<void, UpdateProviderStatusError>> {
        if (request.status === ProviderStatus.Deleted) {
            return fail(new InvalidProviderStatusError());
        }

        const existingResult = await this.dependencies.providerRepository.findById(request.providerId);
        if (!existingResult.success) {
            return fail(existingResult.error);
        }

        const existingProvider = existingResult.value;
        if (!existingProvider || existingProvider.deletedAt) {
            return fail(new ProviderNotFoundError());
        }

        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }

        const updatedProvider = existingProvider.updateInfo({
            status: request.status,
            updatedAt: nowResult.value,
        });

        const updateResult = await this.dependencies.providerRepository.update(updatedProvider);
        if (!updateResult.success) {
            return fail(updateResult.error);
        }

        const action = request.status === ProviderStatus.Active ? 'PROVIDER_ACTIVATED' : 'PROVIDER_DEACTIVATED';
        const auditResult = await this.dependencies.auditLogger.log({
            action,
            actorUserId: request.actorUserId,
            targetUserId: updatedProvider.id,
            metadata: {
                status: updatedProvider.status,
            },
            createdAt: nowResult.value,
        });
        if (!auditResult.success) {
            return fail(auditResult.error);
        }

        const reindexResult = await this.dependencies.ragReindexProviderInvoicesService.reindexByProviderId(
            updatedProvider.id,
        );
        if (!reindexResult.success) {
            return fail(reindexResult.error);
        }

        return ok(undefined);
    }
}
