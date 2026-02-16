import type { UpdateProviderRequest } from '@application/dto/update-provider.request.js';
import type { ProviderRepository } from '@application/ports/provider.repository.js';
import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { PortError } from '@application/errors/port.error.js';
import type { RagReindexProviderInvoicesHandler } from '@application/services/rag-reindex-provider-invoices.service.js';
import { ProviderNotFoundError } from '@domain/errors/provider-not-found.error.js';
import { ProviderAlreadyExistsError } from '@domain/errors/provider-already-exists.error.js';
import { InvalidCifError } from '@domain/errors/invalid-cif.error.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import type { Provider } from '@domain/entities/provider.entity.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';
import { ok, fail, type Result } from '@shared/result.js';
import { normalizeText } from '@shared/text-utils.js';

export type UpdateProviderDependencies = {
    providerRepository: ProviderRepository;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
    ragReindexProviderInvoicesService: RagReindexProviderInvoicesHandler;
};

export type UpdateProviderError =
    | ProviderNotFoundError
    | ProviderAlreadyExistsError
    | InvalidCifError
    | InvoiceNotFoundError
    | PortError;

export class UpdateProviderUseCase {
    constructor(private readonly dependencies: UpdateProviderDependencies) {}

    async execute(request: UpdateProviderRequest): Promise<Result<void, UpdateProviderError>> {
        const existingResult = await this.loadExistingProvider(request.providerId);
        if (!existingResult.success) {
            return fail(existingResult.error);
        }
        const existingProvider = existingResult.value;

        const cifResult = this.buildCif(request.cif);
        if (!cifResult.success) {
            return fail(cifResult.error);
        }
        const cif = cifResult.value;

        const uniquenessResult = await this.ensureNoDuplicate(existingProvider, request, cif);
        if (!uniquenessResult.success) {
            return fail(uniquenessResult.error);
        }

        const nowResult = this.getNow();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }
        const now = nowResult.value;

        const updatedProvider = this.applyUpdates(existingProvider, request, cif, now);

        const updateResult = await this.dependencies.providerRepository.update(updatedProvider);
        if (!updateResult.success) {
            return fail(updateResult.error);
        }

        const auditResult = await this.dependencies.auditLogger.log({
            action: 'PROVIDER_UPDATED',
            actorUserId: request.actorUserId,
            targetUserId: updatedProvider.id,
            metadata: {
                razonSocial: updatedProvider.razonSocial,
                cif: updatedProvider.cif ?? null,
            },
            createdAt: now,
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

    private async loadExistingProvider(
        providerId: string,
    ): Promise<Result<Provider, ProviderNotFoundError | PortError>> {
        const existingResult = await this.dependencies.providerRepository.findById(providerId);
        if (!existingResult.success) {
            return fail(existingResult.error);
        }

        const existingProvider = existingResult.value;
        if (!existingProvider || existingProvider.deletedAt) {
            return fail(new ProviderNotFoundError());
        }

        return ok(existingProvider);
    }

    private buildCif(cifValue: string | undefined): Result<Cif | undefined, InvalidCifError> {
        if (cifValue === undefined) {
            return ok(undefined);
        }

        try {
            return ok(Cif.create(cifValue));
        } catch (error) {
            if (error instanceof InvalidCifError) {
                return fail(error);
            }
            throw error;
        }
    }

    private async ensureNoDuplicate(
        existingProvider: Provider,
        request: UpdateProviderRequest,
        cif: Cif | undefined,
    ): Promise<Result<void, ProviderAlreadyExistsError | PortError>> {
        if (cif) {
            return this.ensureNoDuplicateByCif(existingProvider, cif);
        }

        if (request.razonSocial !== undefined && !existingProvider.cif) {
            return this.ensureNoDuplicateByRazonSocial(existingProvider, request.razonSocial);
        }

        return ok(undefined);
    }

    private async ensureNoDuplicateByCif(
        existingProvider: Provider,
        cif: Cif,
    ): Promise<Result<void, ProviderAlreadyExistsError | PortError>> {
        if (existingProvider.cif === cif.getValue()) {
            return ok(undefined);
        }

        const duplicate = await this.dependencies.providerRepository.findByCif(cif.getValue());
        if (!duplicate.success) {
            return fail(duplicate.error);
        }
        if (duplicate.value && duplicate.value.id !== existingProvider.id) {
            return fail(new ProviderAlreadyExistsError());
        }
        return ok(undefined);
    }

    private async ensureNoDuplicateByRazonSocial(
        existingProvider: Provider,
        razonSocial: string,
    ): Promise<Result<void, ProviderAlreadyExistsError | PortError>> {
        const normalized = normalizeText(razonSocial);
        const duplicate = await this.dependencies.providerRepository.findByRazonSocialNormalized(normalized);
        if (!duplicate.success) {
            return fail(duplicate.error);
        }
        if (duplicate.value && duplicate.value.id !== existingProvider.id) {
            return fail(new ProviderAlreadyExistsError());
        }
        return ok(undefined);
    }

    private getNow(): Result<Date, PortError> {
        return this.dependencies.dateProvider.now();
    }

    private applyUpdates(
        provider: Provider,
        request: UpdateProviderRequest,
        cif: Cif | undefined,
        now: Date,
    ): Provider {
        return provider.updateInfo({
            ...(request.razonSocial === undefined ? {} : { razonSocial: request.razonSocial }),
            ...(cif ? { cif } : {}),
            ...(request.direccion === undefined ? {} : { direccion: request.direccion }),
            ...(request.poblacion === undefined ? {} : { poblacion: request.poblacion }),
            ...(request.provincia === undefined ? {} : { provincia: request.provincia }),
            ...(request.pais === undefined ? {} : { pais: request.pais }),
            updatedAt: now,
        });
    }
}
