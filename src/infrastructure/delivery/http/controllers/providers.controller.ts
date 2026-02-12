import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateProviderUseCase } from '@application/use-cases/create-provider.use-case.js';
import type { ListProvidersUseCase } from '@application/use-cases/list-providers.use-case.js';
import type { GetProviderDetailUseCase } from '@application/use-cases/get-provider-detail.use-case.js';
import type { UpdateProviderUseCase } from '@application/use-cases/update-provider.use-case.js';
import type { UpdateProviderStatusUseCase } from '@application/use-cases/update-provider-status.use-case.js';
import type { SoftDeleteProviderUseCase } from '@application/use-cases/soft-delete-provider.use-case.js';
import { InvalidCifError } from '@domain/errors/invalid-cif.error.js';
import { InvalidProviderStatusError } from '@domain/errors/invalid-provider-status.error.js';
import { ProviderAlreadyExistsError } from '@domain/errors/provider-already-exists.error.js';
import { ProviderNotFoundError } from '@domain/errors/provider-not-found.error.js';
import { ProviderStatus } from '@domain/entities/provider.entity.js';
import { PortError } from '@application/errors/port.error.js';

export type CreateProviderBody = {
    razonSocial: string;
    cif?: string;
    direccion?: string;
    poblacion?: string;
    provincia?: string;
    pais?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'DELETED' | 'DRAFT';
};

export type UpdateProviderBody = {
    razonSocial?: string;
    cif?: string;
    direccion?: string;
    poblacion?: string;
    provincia?: string;
    pais?: string;
};

export type UpdateProviderStatusBody = {
    status: 'ACTIVE' | 'INACTIVE' | 'DELETED' | 'DRAFT';
};

export type ProvidersListQuery = {
    status?: 'ACTIVE' | 'INACTIVE' | 'DELETED' | 'DRAFT';
    q?: string;
    page?: number;
    pageSize?: number;
};

export type ProviderDetailParams = {
    providerId: string;
};

export class ProvidersController {
    constructor(
        private readonly createProviderUseCase: CreateProviderUseCase,
        private readonly listProvidersUseCase: ListProvidersUseCase,
        private readonly getProviderDetailUseCase: GetProviderDetailUseCase,
        private readonly updateProviderUseCase: UpdateProviderUseCase,
        private readonly updateProviderStatusUseCase: UpdateProviderStatusUseCase,
        private readonly softDeleteProviderUseCase: SoftDeleteProviderUseCase,
    ) {}

    async createProvider(request: FastifyRequest<{ Body: CreateProviderBody }>, reply: FastifyReply) {
        const actorUserId = request.auth?.userId;
        if (!actorUserId) {
            return reply.code(401).send({ error: 'UNAUTHORIZED' });
        }

        const status = request.body.status ? this.mapStatus(request.body.status) : undefined;
        if (request.body.status && !status) {
            return reply.code(400).send({ error: 'INVALID_STATUS' });
        }

        const result = await this.createProviderUseCase.execute({
            actorUserId,
            razonSocial: request.body.razonSocial,
            ...(request.body.cif ? { cif: request.body.cif } : {}),
            ...(request.body.direccion ? { direccion: request.body.direccion } : {}),
            ...(request.body.poblacion ? { poblacion: request.body.poblacion } : {}),
            ...(request.body.provincia ? { provincia: request.body.provincia } : {}),
            ...(request.body.pais ? { pais: request.body.pais } : {}),
            ...(status ? { status } : {}),
        });

        if (result.success) {
            return reply.code(201).send(result.value);
        }

        if (result.error instanceof ProviderAlreadyExistsError) {
            return reply.code(400).send({ error: 'PROVIDER_ALREADY_EXISTS' });
        }

        if (result.error instanceof InvalidCifError) {
            return reply.code(400).send({ error: 'INVALID_CIF' });
        }

        if (result.error instanceof InvalidProviderStatusError) {
            return reply.code(400).send({ error: 'INVALID_STATUS' });
        }

        if (result.error instanceof PortError) {
            return reply.code(500).send({ error: 'INTERNAL_ERROR' });
        }

        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
    }

    async listProviders(
        request: FastifyRequest<{ Querystring: ProvidersListQuery }>,
        reply: FastifyReply,
    ) {
        const status = request.query.status ? this.mapStatus(request.query.status) : undefined;
        if (request.query.status && !status) {
            return reply.code(400).send({ error: 'INVALID_STATUS' });
        }

        const page = request.query.page ?? 1;
        const pageSize = request.query.pageSize ?? 20;

        const result = await this.listProvidersUseCase.execute({
            page,
            pageSize,
            ...(status ? { status } : {}),
            ...(request.query.q ? { q: request.query.q } : {}),
        });

        if (result.success) {
            return reply.code(200).send({
                items: result.value.items.map((item) => ({
                    providerId: item.providerId,
                    razonSocial: item.razonSocial,
                    status: this.mapStatusToApi(item.status),
                })),
                page: result.value.page,
                pageSize: result.value.pageSize,
                total: result.value.total,
            });
        }

        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
    }

    async getProviderDetail(
        request: FastifyRequest<{ Params: ProviderDetailParams }>,
        reply: FastifyReply,
    ) {
        const result = await this.getProviderDetailUseCase.execute({
            providerId: request.params.providerId,
        });

        if (result.success) {
            return reply.code(200).send({
                providerId: result.value.providerId,
                razonSocial: result.value.razonSocial,
                ...(result.value.cif ? { cif: result.value.cif } : {}),
                ...(result.value.direccion ? { direccion: result.value.direccion } : {}),
                ...(result.value.poblacion ? { poblacion: result.value.poblacion } : {}),
                ...(result.value.provincia ? { provincia: result.value.provincia } : {}),
                ...(result.value.pais ? { pais: result.value.pais } : {}),
                status: this.mapStatusToApi(result.value.status),
                createdAt: result.value.createdAt.toISOString(),
                updatedAt: result.value.updatedAt.toISOString(),
                deletedAt: result.value.deletedAt ? result.value.deletedAt.toISOString() : null,
            });
        }

        if (result.error instanceof ProviderNotFoundError) {
            return reply.code(404).send({ error: 'NOT_FOUND' });
        }

        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
    }

    async updateProvider(
        request: FastifyRequest<{ Params: ProviderDetailParams; Body: UpdateProviderBody }>,
        reply: FastifyReply,
    ) {
        const actorUserId = request.auth?.userId;
        if (!actorUserId) {
            return reply.code(401).send({ error: 'UNAUTHORIZED' });
        }

        const result = await this.updateProviderUseCase.execute({
            actorUserId,
            providerId: request.params.providerId,
            ...(request.body.razonSocial === undefined ? {} : { razonSocial: request.body.razonSocial }),
            ...(request.body.cif === undefined ? {} : { cif: request.body.cif }),
            ...(request.body.direccion === undefined ? {} : { direccion: request.body.direccion }),
            ...(request.body.poblacion === undefined ? {} : { poblacion: request.body.poblacion }),
            ...(request.body.provincia === undefined ? {} : { provincia: request.body.provincia }),
            ...(request.body.pais === undefined ? {} : { pais: request.body.pais }),
        });

        if (result.success) {
            return this.respondWithProviderDetail(reply, request.params.providerId);
        }

        if (result.error instanceof ProviderNotFoundError) {
            return reply.code(404).send({ error: 'NOT_FOUND' });
        }

        if (result.error instanceof ProviderAlreadyExistsError) {
            return reply.code(400).send({ error: 'PROVIDER_ALREADY_EXISTS' });
        }

        if (result.error instanceof InvalidCifError) {
            return reply.code(400).send({ error: 'INVALID_CIF' });
        }

        if (result.error instanceof PortError) {
            return reply.code(500).send({ error: 'INTERNAL_ERROR' });
        }

        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
    }

    async updateProviderStatus(
        request: FastifyRequest<{ Params: ProviderDetailParams; Body: UpdateProviderStatusBody }>,
        reply: FastifyReply,
    ) {
        const actorUserId = request.auth?.userId;
        if (!actorUserId) {
            return reply.code(401).send({ error: 'UNAUTHORIZED' });
        }

        const status = this.mapStatus(request.body.status);
        if (!status) {
            return reply.code(400).send({ error: 'INVALID_STATUS' });
        }

        const result = await this.updateProviderStatusUseCase.execute({
            actorUserId,
            providerId: request.params.providerId,
            status,
        });

        if (result.success) {
            return this.respondWithProviderDetail(reply, request.params.providerId);
        }

        if (result.error instanceof ProviderNotFoundError) {
            return reply.code(404).send({ error: 'NOT_FOUND' });
        }

        if (result.error instanceof InvalidProviderStatusError) {
            return reply.code(400).send({ error: 'INVALID_STATUS' });
        }

        if (result.error instanceof PortError) {
            return reply.code(500).send({ error: 'INTERNAL_ERROR' });
        }

        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
    }

    async softDeleteProvider(
        request: FastifyRequest<{ Params: ProviderDetailParams }>,
        reply: FastifyReply,
    ) {
        const actorUserId = request.auth?.userId;
        if (!actorUserId) {
            return reply.code(401).send({ error: 'UNAUTHORIZED' });
        }

        const result = await this.softDeleteProviderUseCase.execute({
            actorUserId,
            providerId: request.params.providerId,
        });

        if (result.success) {
            return reply.code(204).send();
        }

        if (result.error instanceof ProviderNotFoundError) {
            return reply.code(404).send({ error: 'NOT_FOUND' });
        }

        if (result.error instanceof PortError) {
            return reply.code(500).send({ error: 'INTERNAL_ERROR' });
        }

        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
    }

    private mapStatus(value: 'ACTIVE' | 'INACTIVE' | 'DELETED' | 'DRAFT'): ProviderStatus | null {
        switch (value) {
            case 'ACTIVE':
                return ProviderStatus.Active;
            case 'INACTIVE':
                return ProviderStatus.Inactive;
            case 'DELETED':
                return ProviderStatus.Deleted;
            case 'DRAFT':
                return ProviderStatus.Draft;
            default:
                return null;
        }
    }

    private mapStatusToApi(value: ProviderStatus): 'ACTIVE' | 'INACTIVE' | 'DELETED' | 'DRAFT' {
        switch (value) {
            case ProviderStatus.Active:
                return 'ACTIVE';
            case ProviderStatus.Inactive:
                return 'INACTIVE';
            case ProviderStatus.Deleted:
                return 'DELETED';
            case ProviderStatus.Draft:
                return 'DRAFT';
            default:
                return 'ACTIVE';
        }
    }

    private async respondWithProviderDetail(reply: FastifyReply, providerId: string) {
        const detail = await this.getProviderDetailUseCase.execute({ providerId });

        if (detail.success) {
            return reply.code(200).send({
                providerId: detail.value.providerId,
                razonSocial: detail.value.razonSocial,
                ...(detail.value.cif ? { cif: detail.value.cif } : {}),
                ...(detail.value.direccion ? { direccion: detail.value.direccion } : {}),
                ...(detail.value.poblacion ? { poblacion: detail.value.poblacion } : {}),
                ...(detail.value.provincia ? { provincia: detail.value.provincia } : {}),
                ...(detail.value.pais ? { pais: detail.value.pais } : {}),
                status: this.mapStatusToApi(detail.value.status),
                createdAt: detail.value.createdAt.toISOString(),
                updatedAt: detail.value.updatedAt.toISOString(),
                deletedAt: detail.value.deletedAt ? detail.value.deletedAt.toISOString() : null,
            });
        }

        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
    }
}
