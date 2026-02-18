/**
 * @fileoverview Adaptador de logging para consola
 *
 * Implementación del puerto Logger que escribe a la consola del sistema.
 * Diseñado para entornos de desarrollo con formato legible.
 *
 * @module infrastructure/adapters/logging/console-logger
 */

import type { Logger, LogContext, LogLevel } from '@application/ports/logger.js';

/**
 * Orden de severidad de los niveles de log.
 * Usado para filtrar mensajes según el nivel mínimo configurado.
 */
const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

/**
 * Opciones de configuración del ConsoleLogger.
 */
export interface ConsoleLoggerOptions {
    /** Nivel mínimo de log a mostrar. Por defecto: 'debug' */
    minLevel?: LogLevel;
}

/**
 * Logger que escribe mensajes a la consola.
 *
 * Características:
 * - Formato legible con timestamp y nivel
 * - Contexto serializado como JSON
 * - Stack trace incluido en errores
 * - Filtrado por nivel mínimo
 *
 * @example
 * const logger = new ConsoleLogger({ minLevel: 'info' });
 * logger.info('Server started', { port: 3000 });
 * // [2026-02-18T10:30:00.000Z] INFO: Server started {"port":3000}
 */
export class ConsoleLogger implements Logger {
    private readonly minLevelOrder: number;

    constructor(options: ConsoleLoggerOptions = {}) {
        const minLevel = options.minLevel ?? 'debug';
        this.minLevelOrder = LOG_LEVEL_ORDER[minLevel];
    }

    debug(message: string, context?: LogContext): void {
        this.log('debug', message, context);
    }

    info(message: string, context?: LogContext): void {
        this.log('info', message, context);
    }

    warn(message: string, context?: LogContext): void {
        this.log('warn', message, context);
    }

    error(message: string, context?: LogContext, error?: Error): void {
        this.log('error', message, context, error);
    }

    private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
        if (LOG_LEVEL_ORDER[level] < this.minLevelOrder) {
            return;
        }

        const timestamp = new Date().toISOString();
        const levelTag = level.toUpperCase().padEnd(5);
        const contextStr = context && Object.keys(context).length > 0
            ? ` ${JSON.stringify(context)}`
            : '';

        const logMessage = `[${timestamp}] ${levelTag}: ${message}${contextStr}`;

        switch (level) {
            case 'debug':
                console.debug(logMessage);
                break;
            case 'info':
                console.info(logMessage);
                break;
            case 'warn':
                console.warn(logMessage);
                break;
            case 'error':
                console.error(logMessage);
                if (error?.stack) {
                    console.error(error.stack);
                }
                break;
        }
    }
}
