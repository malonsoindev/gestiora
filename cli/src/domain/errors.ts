export class CliError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'CliError';
  }
}

export class AuthError extends CliError {
  constructor(message = 'No autenticado o sesión expirada') {
    super(message, 401);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends CliError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}
