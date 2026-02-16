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

const mapErrorToHttpResponse = (error: unknown, overrides: ErrorOverride[]): ErrorResponse => {
    const override = applyOverride(error, overrides);
    if (override) {
        return override;
    }

    if (error instanceof AuthorizationError) {
        const status = error.code === 'FORBIDDEN' ? 403 : 401;
        return { status, body: { error: error.code } };
    }

    if (error instanceof AuthRateLimitedError) {
        return { status: 429, body: { error: 'RATE_LIMITED' } };
    }

    if (
        error instanceof AuthInvalidCredentialsError ||
        error instanceof AuthUserDisabledError ||
        error instanceof AuthUserLockedError
    ) {
        return { status: 401, body: { error: 'AUTH_INVALID_CREDENTIALS' } };
    }

    if (error instanceof AuthInvalidRefreshTokenError) {
        return { status: 401, body: { error: 'AUTH_INVALID_REFRESH' } };
    }

    if (error instanceof QueryTooAmbiguousError) {
        return { status: 400, body: { error: 'QUERY_TOO_AMBIGUOUS' } };
    }

    if (error instanceof SearchQueryNotFoundError) {
        return { status: 404, body: { error: 'NOT_FOUND' } };
    }

    if (error instanceof UserNotFoundError) {
        return { status: 404, body: { error: 'NOT_FOUND' } };
    }

    if (error instanceof UserAlreadyExistsError) {
        return { status: 400, body: { error: 'USER_ALREADY_EXISTS' } };
    }

    if (
        error instanceof InvalidEmailError ||
        error instanceof InvalidPasswordError ||
        error instanceof InvalidUserRolesError ||
        error instanceof InvalidUserStatusError
    ) {
        return { status: 400, body: { error: 'VALIDATION_ERROR' } };
    }

    if (error instanceof SelfDeletionNotAllowedError) {
        return { status: 400, body: { error: 'SELF_DELETE_NOT_ALLOWED' } };
    }

    if (error instanceof ProviderNotFoundError) {
        return { status: 404, body: { error: 'NOT_FOUND' } };
    }

    if (error instanceof ProviderAlreadyExistsError) {
        return { status: 400, body: { error: 'PROVIDER_ALREADY_EXISTS' } };
    }

    if (error instanceof InvalidCifError) {
        return { status: 400, body: { error: 'INVALID_CIF' } };
    }

    if (error instanceof InvalidProviderStatusError) {
        return { status: 400, body: { error: 'INVALID_STATUS' } };
    }

    if (error instanceof InvoiceNotFoundError) {
        return { status: 404, body: { error: 'NOT_FOUND' } };
    }

    if (error instanceof InvalidInvoiceStatusError) {
        return { status: 400, body: { error: 'INVALID_INVOICE_STATUS' } };
    }

    if (error instanceof InvalidInvoiceTotalsError) {
        return { status: 400, body: { error: 'INVALID_INVOICE_TOTALS' } };
    }

    if (error instanceof PortError) {
        return { status: 500, body: { error: 'INTERNAL_ERROR' } };
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
