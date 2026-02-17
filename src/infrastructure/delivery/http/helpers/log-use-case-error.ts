import type { FastifyBaseLogger } from 'fastify';
import { PortError } from '@application/errors/port.error.js';

/**
 * Logs use case errors with appropriate detail level.
 * Extracts PortError details (cause, port) for better debugging.
 */
export function logUseCaseError(
    log: FastifyBaseLogger,
    error: unknown,
    context: string,
): void {
    if (error instanceof PortError) {
        log.error(
            {
                err: error.cause ?? error,
                message: error.message,
                port: error.port,
            },
            `Port error during ${context}`,
        );
    } else {
        log.error({ err: error }, `Unhandled ${context} error`);
    }
}
