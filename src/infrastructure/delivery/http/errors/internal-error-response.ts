import type { FastifyReply } from 'fastify';

export const sendInternalError = (reply: FastifyReply) =>
    reply.code(500).send({ error: 'INTERNAL_ERROR' });
