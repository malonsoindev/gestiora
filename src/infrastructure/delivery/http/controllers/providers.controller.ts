import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateProviderUseCase } from '../../../../application/use-cases/create-provider.use-case.js';
import { InvalidCifError } from '../../../../domain/errors/invalid-cif.error.js';
import { InvalidProviderStatusError } from '../../../../domain/errors/invalid-provider-status.error.js';
import { ProviderAlreadyExistsError } from '../../../../domain/errors/provider-already-exists.error.js';
import { ProviderStatus } from '../../../../domain/entities/provider.entity.js';
import { PortError } from '../../../../application/errors/port.error.js';

export type CreateProviderBody = {
    razonSocial: string;
    cif?: string;
    direccion?: string;
    poblacion?: string;
    provincia?: string;
    pais?: string;
    status?: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO' | 'BORRADOR';
};

export class ProvidersController {
    constructor(private readonly createProviderUseCase: CreateProviderUseCase) {}

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

    private mapStatus(value: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO' | 'BORRADOR'): ProviderStatus | null {
        switch (value) {
            case 'ACTIVO':
                return ProviderStatus.Activo;
            case 'INACTIVO':
                return ProviderStatus.Inactivo;
            case 'ELIMINADO':
                return ProviderStatus.Eliminado;
            case 'BORRADOR':
                return ProviderStatus.Borrador;
            default:
                return null;
        }
    }
}
