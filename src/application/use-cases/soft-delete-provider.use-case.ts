import type { SoftDeleteProviderRequest } from '../dto/soft-delete-provider.request.js';
import type { ProviderRepository } from '../ports/provider.repository.js';
import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { PortError } from '../errors/port.error.js';
import type { RagReindexProviderInvoicesHandler } from '../services/rag-reindex-provider-invoices.service.js';
import { ProviderNotFoundError } from '../../domain/errors/provider-not-found.error.js';
import { ProviderStatus } from '../../domain/entities/provider.entity.js';
import { InvoiceNotFoundError } from '../../domain/errors/invoice-not-found.error.js';
import { ok, fail, type Result } from '../../shared/result.js';

export type SoftDeleteProviderDependencies = {
    providerRepository: ProviderRepository;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
    ragReindexProviderInvoicesService: RagReindexProviderInvoicesHandler;
};

export type SoftDeleteProviderError = ProviderNotFoundError | InvoiceNotFoundError | PortError;

export class SoftDeleteProviderUseCase {
    constructor(private readonly dependencies: SoftDeleteProviderDependencies) {}

    async execute(
        request: SoftDeleteProviderRequest,
    ): Promise<Result<void, SoftDeleteProviderError>> {
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
            status: ProviderStatus.Deleted,
            deletedAt: nowResult.value,
            updatedAt: nowResult.value,
        });

        const updateResult = await this.dependencies.providerRepository.update(updatedProvider);
        if (!updateResult.success) {
            return fail(updateResult.error);
        }

        const auditResult = await this.dependencies.auditLogger.log({
            action: 'PROVIDER_DELETED',
            actorUserId: request.actorUserId,
            targetUserId: updatedProvider.id,
            metadata: {
                razonSocial: updatedProvider.razonSocial,
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
