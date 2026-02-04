import type { ProviderRepository } from '../ports/provider.repository.js';
import type { ProviderListResponse, ProviderSummary } from '../dto/list-providers.response.js';
import type { ProviderStatus } from '../../domain/entities/provider.entity.js';
import type { PortError } from '../errors/port.error.js';
import { ok, fail, type Result } from '../../shared/result.js';

export type ListProvidersDependencies = {
    providerRepository: ProviderRepository;
};

export type ListProvidersRequest = {
    page: number;
    pageSize: number;
    status?: ProviderStatus;
    q?: string;
};

export type ListProvidersError = PortError;

export class ListProvidersUseCase {
    constructor(private readonly dependencies: ListProvidersDependencies) {}

    async execute(request: ListProvidersRequest): Promise<Result<ProviderListResponse, ListProvidersError>> {
        const filters: {
            page: number;
            pageSize: number;
            status?: ProviderStatus;
            q?: string;
        } = {
            page: request.page,
            pageSize: request.pageSize,
        };

        if (request.status !== undefined) {
            filters.status = request.status;
        }
        if (request.q !== undefined) {
            filters.q = request.q;
        }

        const result = await this.dependencies.providerRepository.list(filters);
        if (!result.success) {
            return fail(result.error);
        }

        const items = result.value.items.map((provider): ProviderSummary => ({
            providerId: provider.id,
            razonSocial: provider.razonSocial,
            status: provider.status,
        }));

        return ok({
            items,
            total: result.value.total,
            page: request.page,
            pageSize: request.pageSize,
        });
    }
}
