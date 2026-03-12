/**
 * Error base de la CLI. Todas las excepciones controladas heredan de esta clase.
 * Opcionalmente transporta el código de estado HTTP que lo originó.
 */
export class CliError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'CliError';
  }
}

/** La petición fue rechazada por falta de autenticación (HTTP 401). */
export class AuthError extends CliError {
  constructor(message = 'No autenticado o sesión expirada') {
    super(message, 401);
    this.name = 'AuthError';
  }
}

/** El recurso solicitado no existe (HTTP 404). */
export class NotFoundError extends CliError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/** El usuario autenticado no tiene permisos suficientes (HTTP 403). */
export class ForbiddenError extends CliError {
  constructor(message = 'Acceso denegado') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}
