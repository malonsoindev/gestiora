import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateManualInvoiceUseCase } from '../../../../application/use-cases/create-manual-invoice.use-case.js';
import { InvalidCifError } from '../../../../domain/errors/invalid-cif.error.js';
import { InvalidProviderStatusError } from '../../../../domain/errors/invalid-provider-status.error.js';
import { ProviderNotFoundError } from '../../../../domain/errors/provider-not-found.error.js';
import { PortError } from '../../../../application/errors/port.error.js';

export type CreateManualInvoiceBody = {
    providerId?: string;
    providerCif?: string;
    invoice: {
        numeroFactura?: string;
        fechaOperacion?: string;
        fechaVencimiento?: string;
        baseImponible?: number;
        iva?: number;
        total?: number;
        movements: Array<{
            concepto: string;
            cantidad: number;
            precio: number;
            baseImponible?: number;
            iva?: number;
            total: number;
        }>;
    };
};

export class InvoicesController {
    constructor(private readonly createManualInvoiceUseCase: CreateManualInvoiceUseCase) {}

    async createManualInvoice(request: FastifyRequest<{ Body: CreateManualInvoiceBody }>, reply: FastifyReply) {
        const actorUserId = request.auth?.userId;
        if (!actorUserId) {
            return reply.code(401).send({ error: 'UNAUTHORIZED' });
        }

        const result = await this.createManualInvoiceUseCase.execute({
            actorUserId,
            ...(request.body.providerId ? { providerId: request.body.providerId } : {}),
            ...(request.body.providerCif ? { providerCif: request.body.providerCif } : {}),
            invoice: request.body.invoice,
        });

        if (result.success) {
            return reply.code(201).send({ invoiceId: result.value.invoiceId });
        }

        if (result.error instanceof ProviderNotFoundError) {
            return reply.code(404).send({ error: 'NOT_FOUND' });
        }

        if (result.error instanceof InvalidProviderStatusError) {
            return reply.code(400).send({ error: 'INVALID_PROVIDER_STATUS' });
        }

        if (result.error instanceof InvalidCifError) {
            return reply.code(400).send({ error: 'INVALID_CIF' });
        }

        if (result.error instanceof PortError) {
            return reply.code(500).send({ error: 'INTERNAL_ERROR' });
        }

        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
    }
}
