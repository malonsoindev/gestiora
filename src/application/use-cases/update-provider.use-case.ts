import type { UpdateProviderRequest } from '../dto/update-provider.request.js';
import type { ProviderRepository } from '../ports/provider.repository.js';
import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { PortError } from '../errors/port.error.js';
import { ProviderNotFoundError } from '../../domain/errors/provider-not-found.error.js';
import { ProviderAlreadyExistsError } from '../../domain/errors/provider-already-exists.error.js';
import { InvalidCifError } from '../../domain/errors/invalid-cif.error.js';
import { Cif } from '../../domain/value-objects/cif.value-object.js';
import { ok, fail, type Result } from '../../shared/result.js';

export type UpdateProviderDependencies = {
    providerRepository: ProviderRepository;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
};

export type UpdateProviderError =
    | ProviderNotFoundError
    | ProviderAlreadyExistsError
    | InvalidCifError
    | PortError;

export class UpdateProviderUseCase {
    constructor(private readonly dependencies: UpdateProviderDependencies) {}

    async execute(request: UpdateProviderRequest): Promise<Result<void, UpdateProviderError>> {
        const existingResult = await this.dependencies.providerRepository.findById(request.providerId);
        if (!existingResult.success) {
            return fail(existingResult.error);
        }

        const existingProvider = existingResult.value;
        if (!existingProvider || existingProvider.deletedAt) {
            return fail(new ProviderNotFoundError());
        }

        let cif: Cif | undefined;
        if (request.cif !== undefined) {
            try {
                cif = Cif.create(request.cif);
            } catch (error) {
                if (error instanceof InvalidCifError) {
                    return fail(error);
                }
                throw error;
            }
        }

        if (cif) {
            if (existingProvider.cif !== cif.getValue()) {
                const duplicate = await this.dependencies.providerRepository.findByCif(cif.getValue());
                if (!duplicate.success) {
                    return fail(duplicate.error);
                }
                if (duplicate.value && duplicate.value.id !== existingProvider.id) {
                    return fail(new ProviderAlreadyExistsError());
                }
            }
        } else if (request.razonSocial !== undefined && !existingProvider.cif) {
            const normalized = request.razonSocial.trim().toLowerCase().replace(/\s+/g, ' ');
            const duplicate = await this.dependencies.providerRepository.findByRazonSocialNormalized(normalized);
            if (!duplicate.success) {
                return fail(duplicate.error);
            }
            if (duplicate.value && duplicate.value.id !== existingProvider.id) {
                return fail(new ProviderAlreadyExistsError());
            }
        }

        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }

        const updatedProvider = existingProvider.updateInfo({
            ...(request.razonSocial !== undefined ? { razonSocial: request.razonSocial } : {}),
            ...(cif ? { cif } : {}),
            ...(request.direccion !== undefined ? { direccion: request.direccion } : {}),
            ...(request.poblacion !== undefined ? { poblacion: request.poblacion } : {}),
            ...(request.provincia !== undefined ? { provincia: request.provincia } : {}),
            ...(request.pais !== undefined ? { pais: request.pais } : {}),
            updatedAt: nowResult.value,
        });

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
            createdAt: nowResult.value,
        });
        if (!auditResult.success) {
            return fail(auditResult.error);
        }

        return ok(undefined);
    }
}
