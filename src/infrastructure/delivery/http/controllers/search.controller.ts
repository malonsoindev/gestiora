import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ProcessSearchQueryUseCase } from '@application/use-cases/process-search-query.use-case.js';
import type { GetSearchResultUseCase } from '@application/use-cases/get-search-result.use-case.js';
import { respondError } from '@infrastructure/delivery/http/errors/respond-error.js';

export type SearchBody = {
    query: string;
};

export class SearchController {
    constructor(
        private readonly processSearchQueryUseCase: ProcessSearchQueryUseCase,
        private readonly getSearchResultUseCase: GetSearchResultUseCase,
    ) {}

    async search(request: FastifyRequest<{ Body: SearchBody }>, reply: FastifyReply) {
        if (!request.auth) {
            return reply.code(401).send({ error: 'UNAUTHORIZED' });
        }

        const result = await this.processSearchQueryUseCase.execute({
            userId: request.auth.userId,
            query: request.body.query,
        });

        if (result.success) {
            reply.header('x-query-id', result.value.queryId);
            return reply.code(200).send({
                answer: result.value.answer,
                references: result.value.references,
            });
        }

        return respondError(reply, result.error);
    }

    async getById(request: FastifyRequest<{ Params: { queryId: string } }>, reply: FastifyReply) {
        const result = await this.getSearchResultUseCase.execute({
            queryId: request.params.queryId,
        });

        if (result.success) {
            return reply.code(200).send({
                answer: result.value.answer,
                references: result.value.references,
            });
        }

        return respondError(reply, result.error);
    }
}
