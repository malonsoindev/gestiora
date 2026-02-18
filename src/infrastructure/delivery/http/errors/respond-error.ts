import type { FastifyReply } from 'fastify';
import { AuthorizationError } from '@application/errors/authorization.error.js';
import { PortError } from '@application/errors/port.error.js';
import { QueryTooAmbiguousError } from '@application/errors/query-too-ambiguous.error.js';
import { AuthInvalidRefreshTokenError } from '@domain/errors/auth-invalid-refresh-token.error.js';
import { AuthInvalidCredentialsError } from '@domain/errors/auth-invalid-credentials.error.js';
import { AuthUserDisabledError } from '@domain/errors/auth-user-disabled.error.js';
import { AuthUserLockedError } from '@domain/errors/auth-user-locked.error.js';
import { AuthRateLimitedError } from '@domain/errors/auth-rate-limited.error.js';
import { InvalidCifError } from '@domain/errors/invalid-cif.error.js';
import { InvalidInvoiceStatusError } from '@domain/errors/invalid-invoice-status.error.js';
import { InvalidInvoiceTotalsError } from '@domain/errors/invalid-invoice-totals.error.js';
import { InvalidPasswordError } from '@domain/errors/invalid-password.error.js';
import { InvalidProviderStatusError } from '@domain/errors/invalid-provider-status.error.js';
import { InvalidUserRolesError } from '@domain/errors/invalid-user-roles.error.js';
import { InvalidUserStatusError } from '@domain/errors/invalid-user-status.error.js';
import { InvalidEmailError } from '@domain/errors/invalid-email.error.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import { ProviderAlreadyExistsError } from '@domain/errors/provider-already-exists.error.js';
import { ProviderNotFoundError } from '@domain/errors/provider-not-found.error.js';
import { SearchQueryNotFoundError } from '@domain/errors/search-query-not-found.error.js';
import { SelfDeletionNotAllowedError } from '@domain/errors/self-deletion-not-allowed.error.js';
import { UserAlreadyExistsError } from '@domain/errors/user-already-exists.error.js';
import { UserNotFoundError } from '@domain/errors/user-not-found.error.js';

type ErrorResponse = {
    status: number;
    body: { error: string };
};

type ErrorConstructor = { prototype: Error };

export type ErrorOverride = {
    error: ErrorConstructor;
    status: number;
    code: string;
};

const applyOverride = (error: unknown, overrides: ErrorOverride[]): ErrorResponse | null => {
    for (const override of overrides) {
        const errorConstructor = override.error as new (...args: unknown[]) => Error;
        if (error instanceof errorConstructor) {
            return { status: override.status, body: { error: override.code } };
        }
    }

    return null;
};

type ErrorMapping = {
    errorClass: new (...args: never[]) => Error;
    status: number;
    code: string;
};

const errorMappings: ErrorMapping[] = [
    // 429 - Rate Limited
    { errorClass: AuthRateLimitedError, status: 429, code: 'RATE_LIMITED' },

    // 401 - Authentication errors
    { errorClass: AuthInvalidCredentialsError, status: 401, code: 'AUTH_INVALID_CREDENTIALS' },
    { errorClass: AuthUserDisabledError, status: 401, code: 'AUTH_INVALID_CREDENTIALS' },
    { errorClass: AuthUserLockedError, status: 401, code: 'AUTH_INVALID_CREDENTIALS' },
    { errorClass: AuthInvalidRefreshTokenError, status: 401, code: 'AUTH_INVALID_REFRESH' },

    // 404 - Not Found
    { errorClass: SearchQueryNotFoundError, status: 404, code: 'NOT_FOUND' },
    { errorClass: UserNotFoundError, status: 404, code: 'NOT_FOUND' },
    { errorClass: ProviderNotFoundError, status: 404, code: 'NOT_FOUND' },
    { errorClass: InvoiceNotFoundError, status: 404, code: 'NOT_FOUND' },

    // 400 - Validation errors
    { errorClass: QueryTooAmbiguousError, status: 400, code: 'QUERY_TOO_AMBIGUOUS' },
    { errorClass: UserAlreadyExistsError, status: 400, code: 'USER_ALREADY_EXISTS' },
    { errorClass: InvalidEmailError, status: 400, code: 'VALIDATION_ERROR' },
    { errorClass: InvalidPasswordError, status: 400, code: 'VALIDATION_ERROR' },
    { errorClass: InvalidUserRolesError, status: 400, code: 'VALIDATION_ERROR' },
    { errorClass: InvalidUserStatusError, status: 400, code: 'VALIDATION_ERROR' },
    { errorClass: SelfDeletionNotAllowedError, status: 400, code: 'SELF_DELETE_NOT_ALLOWED' },
    { errorClass: ProviderAlreadyExistsError, status: 400, code: 'PROVIDER_ALREADY_EXISTS' },
    { errorClass: InvalidCifError, status: 400, code: 'INVALID_CIF' },
    { errorClass: InvalidProviderStatusError, status: 400, code: 'INVALID_STATUS' },
    { errorClass: InvalidInvoiceStatusError, status: 400, code: 'INVALID_INVOICE_STATUS' },
    { errorClass: InvalidInvoiceTotalsError, status: 400, code: 'INVALID_INVOICE_TOTALS' },

    // 500 - Internal errors
    { errorClass: PortError, status: 500, code: 'INTERNAL_ERROR' },
];

const findMappedError = (error: unknown): ErrorResponse | null => {
    for (const mapping of errorMappings) {
        if (error instanceof mapping.errorClass) {
            return { status: mapping.status, body: { error: mapping.code } };
        }
    }
    return null;
};

const handleAuthorizationError = (error: AuthorizationError): ErrorResponse => {
    const status = error.code === 'FORBIDDEN' ? 403 : 401;
    return { status, body: { error: error.code } };
};

const mapErrorToHttpResponse = (error: unknown, overrides: ErrorOverride[]): ErrorResponse => {
    const override = applyOverride(error, overrides);
    if (override) {
        return override;
    }

    if (error instanceof AuthorizationError) {
        return handleAuthorizationError(error);
    }

    const mapped = findMappedError(error);
    if (mapped) {
        return mapped;
    }

    return { status: 500, body: { error: 'INTERNAL_ERROR' } };
};

export const respondError = (
    reply: FastifyReply,
    error: unknown,
    overrides: ErrorOverride[] = [],
) => {
    const response = mapErrorToHttpResponse(error, overrides);
    return reply.code(response.status).send(response.body);
};
