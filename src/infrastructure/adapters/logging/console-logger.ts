/**
 * @fileoverview Adaptador de logging para consola
 *
 * Implementación del puerto Logger que escribe a la consola del sistema.
 * Diseñado para entornos de desarrollo con formato legible y coloreado.
 *
 * @module infrastructure/adapters/logging/console-logger
 */

import chalk from 'chalk';
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
 * Formateadores de color por nivel de log.
 */
const LEVEL_COLORS: Record<LogLevel, (text: string) => string> = {
    debug: chalk.gray,
    info: chalk.cyan,
    warn: chalk.yellow,
    error: chalk.red,
};

/**
 * Iconos por nivel de log.
 */
const LEVEL_ICONS: Record<LogLevel, string> = {
    debug: '○',
    info: '●',
    warn: '⚠',
    error: '✖',
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

        const colorize = LEVEL_COLORS[level];
        const icon = colorize(LEVEL_ICONS[level]);
        const timestamp = chalk.dim(new Date().toISOString());
        const levelTag = colorize(level.toUpperCase().padEnd(5));
        const contextStr = context && Object.keys(context).length > 0
            ? ` ${chalk.dim(JSON.stringify(context))}`
            : '';

        const logMessage = `${icon} [${timestamp}] ${levelTag}: ${message}${contextStr}`;

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
                    console.error(chalk.red(error.stack));
                }
                break;
        }
    }
}
