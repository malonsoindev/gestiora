/**
 * @fileoverview Puerto de logging técnico
 *
 * Define la interfaz para el sistema de logging técnico de Gestiora.
 * Siguiendo Clean Architecture, este puerto permite inyectar diferentes
 * implementaciones (consola, fichero, servicio externo) sin acoplar
 * la lógica de negocio a una implementación concreta.
 *
 * @module application/ports/logger
 * @see {@link ../../docs/DD-00008.md} Design Doc del Logger
 */

/**
 * Niveles de log soportados.
 * Ordenados de menor a mayor severidad.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Contexto adicional para enriquecer los mensajes de log.
 * Permite adjuntar metadatos estructurados a cada entrada.
 *
 * @example
 * { userId: 'user-123', action: 'login', duration: 150 }
 */
export type LogContext = Record<string, unknown>;

/**
 * Interfaz del logger técnico.
 *
 * Los métodos son síncronos y no lanzan excepciones.
 * Los errores internos del logger se absorben silenciosamente.
 *
 * @example
 * logger.info('Server started', { port: 3000 });
 * logger.error('Database connection failed', { host: 'localhost' }, error);
 */
export interface Logger {
    /**
     * Registra un mensaje de depuración.
     * Solo visible en desarrollo, útil para diagnóstico detallado.
     */
    debug(message: string, context?: LogContext): void;

    /**
     * Registra un mensaje informativo.
     * Eventos normales del sistema (arranque, operaciones completadas).
     */
    info(message: string, context?: LogContext): void;

    /**
     * Registra una advertencia.
     * Situaciones anómalas que no impiden el funcionamiento.
     */
    warn(message: string, context?: LogContext): void;

    /**
     * Registra un error.
     * Fallos que requieren atención (excepciones, errores de conexión).
     */
    error(message: string, context?: LogContext, error?: Error): void;
}
