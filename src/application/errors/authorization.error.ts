export type AuthorizationErrorCode = 'UNAUTHENTICATED' | 'FORBIDDEN';

export class AuthorizationError extends Error {
    constructor(
        message: string = 'Access denied',
        public readonly code: AuthorizationErrorCode = 'UNAUTHENTICATED',
    ) {
        super(message);
        this.name = 'AuthorizationError';
    }
}
