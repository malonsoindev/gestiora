import type { FastifyReply, FastifyRequest } from 'fastify';

export class AdminController {
    async ping(_request: FastifyRequest, reply: FastifyReply) {
        return reply.code(200).send({ ok: true });
    }
}
