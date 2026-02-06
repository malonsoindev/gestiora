import { createHash } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import type { CreateManualInvoiceUseCase } from '../../../../application/use-cases/create-manual-invoice.use-case.js';
import type { AttachInvoiceFileUseCase } from '../../../../application/use-cases/attach-invoice-file.use-case.js';
import { InvalidCifError } from '../../../../domain/errors/invalid-cif.error.js';
import { InvalidProviderStatusError } from '../../../../domain/errors/invalid-provider-status.error.js';
import { ProviderNotFoundError } from '../../../../domain/errors/provider-not-found.error.js';
import { InvoiceNotFoundError } from '../../../../domain/errors/invoice-not-found.error.js';
import { InvalidInvoiceStatusError } from '../../../../domain/errors/invalid-invoice-status.error.js';
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
    constructor(
        private readonly createManualInvoiceUseCase: CreateManualInvoiceUseCase,
        private readonly attachInvoiceFileUseCase: AttachInvoiceFileUseCase,
    ) {}

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

    async attachInvoiceFile(
        request: FastifyRequest<{ Params: { invoiceId: string } }>,
        reply: FastifyReply,
    ) {
        const actorUserId = request.auth?.userId;
        if (!actorUserId) {
            return reply.code(401).send({ error: 'UNAUTHORIZED' });
        }

        const file = await request.file();
        if (!file) {
            return reply.code(400).send({ error: 'INVALID_FILE' });
        }

        const content = await file.toBuffer();
        const checksum = createHash('sha256').update(content).digest('hex');

        const result = await this.attachInvoiceFileUseCase.execute({
            actorUserId,
            invoiceId: request.params.invoiceId,
            file: {
                filename: file.filename,
                mimeType: file.mimetype,
                sizeBytes: content.length,
                checksum,
                content,
            },
        });

        if (result.success) {
            return reply.code(200).send(result.value);
        }

        if (result.error instanceof InvoiceNotFoundError) {
            return reply.code(404).send({ error: 'NOT_FOUND' });
        }

        if (result.error instanceof InvalidInvoiceStatusError) {
            return reply.code(400).send({ error: 'INVALID_INVOICE_STATUS' });
        }

        if (result.error instanceof PortError) {
            return reply.code(500).send({ error: 'INTERNAL_ERROR' });
        }

        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
    }
}
