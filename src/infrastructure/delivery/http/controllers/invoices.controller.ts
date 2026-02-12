import { createHash } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateManualInvoiceUseCase } from '@application/use-cases/create-manual-invoice.use-case.js';
import type { AttachInvoiceFileUseCase } from '@application/use-cases/attach-invoice-file.use-case.js';
import type { UpdateManualInvoiceUseCase } from '@application/use-cases/update-manual-invoice.use-case.js';
import type { ListInvoicesUseCase } from '@application/use-cases/list-invoices.use-case.js';
import type { GetInvoiceDetailUseCase } from '@application/use-cases/get-invoice-detail.use-case.js';
import type { SoftDeleteInvoiceUseCase } from '@application/use-cases/soft-delete-invoice.use-case.js';
import type { GetInvoiceFileUseCase } from '@application/use-cases/get-invoice-file.use-case.js';
import type { UploadInvoiceDocumentUseCase } from '@application/use-cases/upload-invoice-document.use-case.js';
import type { ConfirmInvoiceMovementsUseCase } from '@application/use-cases/confirm-invoice-movements.use-case.js';
import type { ConfirmInvoiceHeaderUseCase } from '@application/use-cases/confirm-invoice-header.use-case.js';
import type { ReprocessInvoiceExtractionUseCase } from '@application/use-cases/reprocess-invoice-extraction.use-case.js';
import { InvalidCifError } from '@domain/errors/invalid-cif.error.js';
import { InvalidProviderStatusError } from '@domain/errors/invalid-provider-status.error.js';
import { ProviderNotFoundError } from '@domain/errors/provider-not-found.error.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import { InvalidInvoiceStatusError } from '@domain/errors/invalid-invoice-status.error.js';
import { InvalidInvoiceTotalsError } from '@domain/errors/invalid-invoice-totals.error.js';
import { PortError } from '@application/errors/port.error.js';

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

export type UpdateManualInvoiceBody = {
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

export type InvoicesListQuery = {
    status?: 'DRAFT' | 'ACTIVE' | 'INCONSISTENT' | 'DELETED';
    providerId?: string;
    page?: number;
    pageSize?: number;
};

export type ConfirmInvoiceMovementsBody = {
    movements: Array<{
        id: string;
        action: 'CONFIRM' | 'CORRECT' | 'REJECT';
        concepto?: string;
        cantidad?: number;
        precio?: number;
        baseImponible?: number;
        iva?: number;
        total?: number;
    }>;
};

export type ConfirmInvoiceHeaderBody = {
    fields: {
        numeroFactura?: { action: 'CONFIRM' | 'CORRECT'; value?: string };
        fechaOperacion?: { action: 'CONFIRM' | 'CORRECT'; value?: string };
        fechaVencimiento?: { action: 'CONFIRM' | 'CORRECT'; value?: string };
        baseImponible?: { action: 'CONFIRM' | 'CORRECT'; value?: number };
        iva?: { action: 'CONFIRM' | 'CORRECT'; value?: number };
        total?: { action: 'CONFIRM' | 'CORRECT'; value?: number };
    };
};

export class InvoicesController {
    constructor(
        private readonly createManualInvoiceUseCase: CreateManualInvoiceUseCase,
        private readonly attachInvoiceFileUseCase: AttachInvoiceFileUseCase,
        private readonly updateManualInvoiceUseCase: UpdateManualInvoiceUseCase,
        private readonly listInvoicesUseCase: ListInvoicesUseCase,
        private readonly getInvoiceDetailUseCase: GetInvoiceDetailUseCase,
        private readonly softDeleteInvoiceUseCase: SoftDeleteInvoiceUseCase,
        private readonly getInvoiceFileUseCase: GetInvoiceFileUseCase,
        private readonly uploadInvoiceDocumentUseCase: UploadInvoiceDocumentUseCase,
        private readonly confirmInvoiceMovementsUseCase: ConfirmInvoiceMovementsUseCase,
        private readonly confirmInvoiceHeaderUseCase: ConfirmInvoiceHeaderUseCase,
        private readonly reprocessInvoiceExtractionUseCase: ReprocessInvoiceExtractionUseCase,
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
            request.log.error({
                err: result.error.cause ?? result.error,
                message: result.error.message,
                port: result.error.port,
            }, 'Port error during invoice upload');
            return reply.code(500).send({ error: 'INTERNAL_ERROR' });
        }

        request.log.error({ err: result.error }, 'Unhandled invoice upload error');
        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
    }

    async uploadInvoiceDocument(request: FastifyRequest, reply: FastifyReply) {
        request.log.info('Upload invoice document invoked');
        try {
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

            const result = await this.uploadInvoiceDocumentUseCase.execute({
                actorUserId,
                file: {
                    filename: file.filename,
                    mimeType: file.mimetype,
                    sizeBytes: content.length,
                    checksum,
                    content,
                },
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

            if (result.error instanceof InvalidInvoiceTotalsError) {
                return reply.code(400).send({ error: 'INVALID_INVOICE_TOTALS' });
            }

            if (result.error instanceof InvalidCifError) {
                return reply.code(400).send({ error: 'INVALID_CIF' });
            }

            if (result.error instanceof PortError) {
                request.log.error({
                    err: result.error.cause ?? result.error,
                    message: result.error.message,
                    port: result.error.port,
                }, 'Port error during invoice upload');
                return reply.code(500).send({ error: 'INTERNAL_ERROR' });
            }

            request.log.error({ err: result.error }, 'Unhandled invoice upload error');
            return reply.code(500).send({ error: 'INTERNAL_ERROR' });
        } catch (error) {
            request.log.error({ err: error }, 'Upload invoice failed');
            return reply.code(500).send({ error: 'INTERNAL_ERROR' });
        }
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


        if (result.error instanceof InvalidInvoiceTotalsError) {
            return reply.code(400).send({ error: 'INVALID_INVOICE_TOTALS' });
        }

        if (result.error instanceof PortError) {
            return reply.code(500).send({ error: 'INTERNAL_ERROR' });
        }

        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
    }

    async updateManualInvoice(
        request: FastifyRequest<{ Params: { invoiceId: string }; Body: UpdateManualInvoiceBody }>,
        reply: FastifyReply,
    ) {
        const actorUserId = request.auth?.userId;
        if (!actorUserId) {
            return reply.code(401).send({ error: 'UNAUTHORIZED' });
        }

        const result = await this.updateManualInvoiceUseCase.execute({
            actorUserId,
            invoiceId: request.params.invoiceId,
            invoice: request.body,
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

    async listInvoices(
        request: FastifyRequest<{ Querystring: InvoicesListQuery }>,
        reply: FastifyReply,
    ) {
        const page = request.query.page ?? 1;
        const pageSize = request.query.pageSize ?? 20;

        const result = await this.listInvoicesUseCase.execute({
            page,
            pageSize,
            ...(request.query.status ? { status: request.query.status } : {}),
            ...(request.query.providerId ? { providerId: request.query.providerId } : {}),
        });

        if (result.success) {
            return reply.code(200).send({
                items: result.value.items.map((item: { invoiceId: string; providerId: string; status: string; createdAt: Date }) => ({
                    invoiceId: item.invoiceId,
                    providerId: item.providerId,
                    status: item.status,
                    createdAt: item.createdAt.toISOString(),
                })),
                page: result.value.page,
                pageSize: result.value.pageSize,
                total: result.value.total,
            });
        }

        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
    }

    async getInvoiceDetail(
        request: FastifyRequest<{ Params: { invoiceId: string } }>,
        reply: FastifyReply,
    ) {
        const result = await this.getInvoiceDetailUseCase.execute({
            invoiceId: request.params.invoiceId,
        });

        if (result.success) {
            return reply.code(200).send(result.value);
        }

        if (result.error instanceof InvoiceNotFoundError) {
            return reply.code(404).send({ error: 'NOT_FOUND' });
        }

        if (result.error instanceof PortError) {
            return reply.code(500).send({ error: 'INTERNAL_ERROR' });
        }

        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
    }

    async softDeleteInvoice(
        request: FastifyRequest<{ Params: { invoiceId: string } }>,
        reply: FastifyReply,
    ) {
        const actorUserId = request.auth?.userId;
        if (!actorUserId) {
            return reply.code(401).send({ error: 'UNAUTHORIZED' });
        }

        const result = await this.softDeleteInvoiceUseCase.execute({
            actorUserId,
            invoiceId: request.params.invoiceId,
        });

        if (result.success) {
            return reply.code(204).send();
        }

        if (result.error instanceof InvoiceNotFoundError) {
            return reply.code(404).send({ error: 'NOT_FOUND' });
        }

        if (result.error instanceof PortError) {
            return reply.code(500).send({ error: 'INTERNAL_ERROR' });
        }

        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
    }

    async getInvoiceFile(
        request: FastifyRequest<{ Params: { invoiceId: string } }>,
        reply: FastifyReply,
    ) {
        const result = await this.getInvoiceFileUseCase.execute({
            invoiceId: request.params.invoiceId,
        });

        if (result.success) {
            reply.header('Content-Type', result.value.mimeType);
            reply.header('Content-Length', result.value.sizeBytes);
            reply.header('Content-Disposition', `attachment; filename="${result.value.filename}"`);
            return reply.code(200).send(result.value.content);
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

    async confirmInvoiceMovements(
        request: FastifyRequest<{ Params: { invoiceId: string }; Body: ConfirmInvoiceMovementsBody }>,
        reply: FastifyReply,
    ) {
        const actorUserId = request.auth?.userId;
        if (!actorUserId) {
            return reply.code(401).send({ error: 'UNAUTHORIZED' });
        }

        const result = await this.confirmInvoiceMovementsUseCase.execute({
            actorUserId,
            invoiceId: request.params.invoiceId,
            movements: request.body.movements,
        });

        if (result.success) {
            return reply.code(200).send({ invoiceId: result.value.invoiceId });
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

    async confirmInvoiceHeader(
        request: FastifyRequest<{ Params: { invoiceId: string }; Body: ConfirmInvoiceHeaderBody }>,
        reply: FastifyReply,
    ) {
        const actorUserId = request.auth?.userId;
        if (!actorUserId) {
            return reply.code(401).send({ error: 'UNAUTHORIZED' });
        }

        const result = await this.confirmInvoiceHeaderUseCase.execute({
            actorUserId,
            invoiceId: request.params.invoiceId,
            fields: request.body.fields,
        });

        if (result.success) {
            return reply.code(200).send({ invoiceId: result.value.invoiceId });
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

    async reprocessInvoiceExtraction(
        request: FastifyRequest<{ Params: { invoiceId: string } }>,
        reply: FastifyReply,
    ) {
        const actorUserId = request.auth?.userId;
        if (!actorUserId) {
            return reply.code(401).send({ error: 'UNAUTHORIZED' });
        }

        const result = await this.reprocessInvoiceExtractionUseCase.execute({
            actorUserId,
            invoiceId: request.params.invoiceId,
        });

        if (result.success) {
            return reply.code(200).send({ invoiceId: result.value.invoiceId });
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
