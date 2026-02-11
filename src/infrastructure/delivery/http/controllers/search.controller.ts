import type { FastifyReply, FastifyRequest } from 'fastify';
import type { QueryInvoicesRagUseCase } from '../../../../application/use-cases/query-invoices-rag.use-case.js';
import { PortError } from '../../../../application/errors/port.error.js';

export type SearchBody = {
    query: string;
};

export class SearchController {
    constructor(private readonly queryInvoicesRagUseCase: QueryInvoicesRagUseCase) {}

    async search(request: FastifyRequest<{ Body: SearchBody }>, reply: FastifyReply) {
        const result = await this.queryInvoicesRagUseCase.execute({
            query: request.body.query,
        });

        if (result.success) {
            return reply.code(200).send({
                answer: result.value.answer,
                references: result.value.references,
            });
        }

        if (result.error instanceof PortError) {
            return reply.code(500).send({ error: 'INTERNAL_ERROR' });
        }

        return reply.code(500).send({ error: 'INTERNAL_ERROR' });
    }
}
