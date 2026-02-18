/**
 * @fileoverview Adaptador de logging silencioso
 *
 * Implementación del puerto Logger que no produce salida.
 * Útil para tests donde no se desea output en consola.
 *
 * @module infrastructure/adapters/logging/noop-logger
 */

import type { Logger, LogContext } from '@application/ports/logger.js';

/**
 * Logger que no produce ninguna salida.
 *
 * Todos los métodos son no-operativos (no-op).
 * Útil para:
 * - Tests automatizados (evita ruido en output)
 * - Desactivar logging temporalmente
 * - Benchmarking sin overhead de I/O
 *
 * @example
 * const logger = new NoopLogger();
 * logger.info('This message is silently ignored');
 */
export class NoopLogger implements Logger {
    debug(_message: string, _context?: LogContext): void {
        // No-op: silently ignore
    }

    info(_message: string, _context?: LogContext): void {
        // No-op: silently ignore
    }

    warn(_message: string, _context?: LogContext): void {
        // No-op: silently ignore
    }

    error(_message: string, _context?: LogContext, _error?: Error): void {
        // No-op: silently ignore
    }
}
