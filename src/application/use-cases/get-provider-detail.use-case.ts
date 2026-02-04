import type { ProviderRepository } from '../ports/provider.repository.js';
import type { ProviderDetailResponse } from '../dto/get-provider-detail.response.js';
import type { PortError } from '../errors/port.error.js';
import { ProviderNotFoundError } from '../../domain/errors/provider-not-found.error.js';
import { ok, fail, type Result } from '../../shared/result.js';

export type GetProviderDetailDependencies = {
    providerRepository: ProviderRepository;
};

export type GetProviderDetailRequest = {
    providerId: string;
};

export type GetProviderDetailError = ProviderNotFoundError | PortError;

export class GetProviderDetailUseCase {
    constructor(private readonly dependencies: GetProviderDetailDependencies) {}

    async execute(
        request: GetProviderDetailRequest,
    ): Promise<Result<ProviderDetailResponse, GetProviderDetailError>> {
        const result = await this.dependencies.providerRepository.findById(request.providerId);
        if (!result.success) {
            return fail(result.error);
        }

        if (!result.value) {
            return fail(new ProviderNotFoundError());
        }

        const provider = result.value;
        if (provider.deletedAt) {
            return fail(new ProviderNotFoundError());
        }

        return ok({
            providerId: provider.id,
            razonSocial: provider.razonSocial,
            ...(provider.cif ? { cif: provider.cif } : {}),
            ...(provider.direccion ? { direccion: provider.direccion } : {}),
            ...(provider.poblacion ? { poblacion: provider.poblacion } : {}),
            ...(provider.provincia ? { provincia: provider.provincia } : {}),
            ...(provider.pais ? { pais: provider.pais } : {}),
            status: provider.status,
            createdAt: provider.createdAt,
            updatedAt: provider.updatedAt,
            ...(provider.deletedAt ? { deletedAt: provider.deletedAt } : {}),
        });
    }
}
