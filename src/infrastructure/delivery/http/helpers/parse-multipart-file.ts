import { createHash } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';

export type ParsedFile = {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    checksum: string;
    content: Buffer;
};

/**
 * Parses a multipart file from the request, calculates checksum, and returns file metadata.
 * Returns null and sends 400 response if no file is provided.
 */
export async function parseMultipartFile(
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<ParsedFile | null> {
    const file = await request.file();
    if (!file) {
        reply.code(400).send({ error: 'INVALID_FILE' });
        return null;
    }

    const content = await file.toBuffer();
    const checksum = createHash('sha256').update(content).digest('hex');

    return {
        filename: file.filename,
        mimeType: file.mimetype,
        sizeBytes: content.length,
        checksum,
        content,
    };
}
