import type { CreateProviderRequest } from '@application/dto/create-provider.request.js';
import type { CreateProviderResponse } from '@application/dto/create-provider.response.js';
import type { ProviderRepository } from '@application/ports/provider.repository.js';
import type { IdGenerator } from '@application/ports/id-generator.js';
import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { PortError } from '@application/errors/port.error.js';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import { ProviderAlreadyExistsError } from '@domain/errors/provider-already-exists.error.js';
import { InvalidCifError } from '@domain/errors/invalid-cif.error.js';
import { InvalidProviderStatusError } from '@domain/errors/invalid-provider-status.error.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';
import { ok, fail, type Result } from '@shared/result.js';
import { normalizeText } from '@shared/text-utils.js';
import { tryCif } from '@shared/cif-utils.js';

export type CreateProviderDependencies = {
    providerRepository: ProviderRepository;
    providerIdGenerator: IdGenerator;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
};

export type CreateProviderError =
    | ProviderAlreadyExistsError
    | InvalidCifError
    | InvalidProviderStatusError
    | PortError;

export class CreateProviderUseCase {
    constructor(private readonly dependencies: CreateProviderDependencies) {}

    async execute(
        request: CreateProviderRequest,
    ): Promise<Result<CreateProviderResponse, CreateProviderError>> {
        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }

        const now = nowResult.value;

        const cifResult = tryCif(request.cif);
        if (!cifResult.success) {
            return fail(cifResult.error);
        }
        const cif = cifResult.value;

        const uniquenessResult = await this.ensureProviderNotExists(cif, request.razonSocial);
        if (!uniquenessResult.success) {
            return fail(uniquenessResult.error);
        }

        const statusResult = this.validateStatus(request.status ?? ProviderStatus.Active);
        if (!statusResult.success) {
            return fail(statusResult.error);
        }
        const status = statusResult.value;

        const provider = Provider.create({
            id: this.dependencies.providerIdGenerator.generate(),
            razonSocial: request.razonSocial,
            ...(cif ? { cif } : {}),
            ...(request.direccion ? { direccion: request.direccion } : {}),
            ...(request.poblacion ? { poblacion: request.poblacion } : {}),
            ...(request.provincia ? { provincia: request.provincia } : {}),
            ...(request.pais ? { pais: request.pais } : {}),
            status,
            createdAt: now,
            updatedAt: now,
        });

        const createResult = await this.dependencies.providerRepository.create(provider);
        if (!createResult.success) {
            return fail(createResult.error);
        }

        const auditResult = await this.dependencies.auditLogger.log({
            action: 'PROVIDER_CREATED',
            actorUserId: request.actorUserId,
            targetUserId: provider.id,
            metadata: {
                razonSocial: provider.razonSocial,
                cif: provider.cif ?? null,
            },
            createdAt: now,
        });
        if (!auditResult.success) {
            return fail(auditResult.error);
        }

        return ok({ providerId: provider.id });
    }

    private async ensureProviderNotExists(
        cif: Cif | undefined,
        razonSocial: string,
    ): Promise<Result<void, ProviderAlreadyExistsError | PortError>> {
        if (cif) {
            const existing = await this.dependencies.providerRepository.findByCif(cif.getValue());
            if (!existing.success) {
                return fail(existing.error);
            }
            if (existing.value) {
                return fail(new ProviderAlreadyExistsError());
            }
            return ok(undefined);
        }

        const normalized = normalizeText(razonSocial);
        const existing = await this.dependencies.providerRepository.findByRazonSocialNormalized(normalized);
        if (!existing.success) {
            return fail(existing.error);
        }
        if (existing.value) {
            return fail(new ProviderAlreadyExistsError());
        }
        return ok(undefined);
    }

    private validateStatus(status: ProviderStatus): Result<ProviderStatus, InvalidProviderStatusError> {
        if (status === ProviderStatus.Deleted) {
            return fail(new InvalidProviderStatusError());
        }
        return ok(status);
    }
}
