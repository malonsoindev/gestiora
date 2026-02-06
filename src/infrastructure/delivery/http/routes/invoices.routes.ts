import type { FastifyInstance } from 'fastify';
import type { AuthorizeRequestUseCase } from '../../../../application/use-cases/authorize-request.use-case.js';
import type {
    InvoicesController,
    CreateManualInvoiceBody,
    UpdateManualInvoiceBody,
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
};
