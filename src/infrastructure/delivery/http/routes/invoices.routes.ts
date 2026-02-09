import type { FastifyInstance } from 'fastify';
import type { AuthorizeRequestUseCase } from '../../../../application/use-cases/authorize-request.use-case.js';
import type {
    InvoicesController,
    CreateManualInvoiceBody,
    UpdateManualInvoiceBody,
    ConfirmInvoiceMovementsBody,
    ConfirmInvoiceHeaderBody,
    InvoicesListQuery,
} from '../controllers/invoices.controller.js';
import { buildAuthorizeMiddleware } from '../middlewares/authorize.middleware.js';
import { invoicesSchemas } from '../schemas/invoices.schemas.js';

export const registerInvoicesRoutes = async (
    app: FastifyInstance,
    controller: InvoicesController,
    authorizeRequestUseCase: AuthorizeRequestUseCase,
): Promise<void> => {
    app.post<{ Body: CreateManualInvoiceBody }>(
        '/documents/manual',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: invoicesSchemas.createManual,
        },
        async (request, reply) => controller.createManualInvoice(request, reply),
    );

    app.put<{ Params: { invoiceId: string } }>(
        '/documents/:invoiceId/file',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: invoicesSchemas.attachFile,
        },
        async (request, reply) => controller.attachInvoiceFile(request, reply),
    );

    app.put<{ Params: { invoiceId: string }; Body: UpdateManualInvoiceBody }>(
        '/documents/:invoiceId/invoice',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: invoicesSchemas.updateManual,
        },
        async (request, reply) => controller.updateManualInvoice(request, reply),
    );

    app.put<{ Params: { invoiceId: string }; Body: ConfirmInvoiceMovementsBody }>(
        '/documents/:invoiceId/movements/confirm',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: invoicesSchemas.confirmMovements,
        },
        async (request, reply) => controller.confirmInvoiceMovements(request, reply),
    );

    app.put<{ Params: { invoiceId: string }; Body: ConfirmInvoiceHeaderBody }>(
        '/documents/:invoiceId/header/confirm',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: invoicesSchemas.confirmHeader,
        },
        async (request, reply) => controller.confirmInvoiceHeader(request, reply),
    );

    app.get<{ Querystring: InvoicesListQuery }>(
        '/documents',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: invoicesSchemas.list,
        },
        async (request, reply) => controller.listInvoices(request, reply),
    );

    app.post(
        '/documents',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: invoicesSchemas.upload,
        },
        async (request, reply) => controller.uploadInvoiceDocument(request, reply),
    );

    app.get<{ Params: { invoiceId: string } }>(
        '/documents/:invoiceId',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: invoicesSchemas.detail,
        },
        async (request, reply) => controller.getInvoiceDetail(request, reply),
    );

    app.delete<{ Params: { invoiceId: string } }>(
        '/documents/:invoiceId',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: invoicesSchemas.softDelete,
        },
        async (request, reply) => controller.softDeleteInvoice(request, reply),
    );

    app.get<{ Params: { invoiceId: string } }>(
        '/documents/:invoiceId/file',
        {
            preHandler: buildAuthorizeMiddleware(authorizeRequestUseCase, false),
            schema: invoicesSchemas.file,
        },
        async (request, reply) => controller.getInvoiceFile(request, reply),
    );
};
