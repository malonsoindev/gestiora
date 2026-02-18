// ============================================
// Shared schema building blocks
// ============================================

const errorResponse = {
    type: 'object',
    required: ['error'],
    properties: {
        error: { type: 'string' },
    },
} as const;

const userIdParams = {
    type: 'object',
    required: ['userId'],
    properties: {
        userId: { type: 'string' },
    },
} as const;

const statusEnum = { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED'] } as const;
const rolesEnum = { type: 'string', enum: ['Usuario', 'Administrador'] } as const;
const rolesArray = { type: 'array', items: rolesEnum } as const;
const rolesArrayMinOne = { type: 'array', minItems: 1, items: rolesEnum } as const;

const securityBearer = [{ bearerAuth: [] }] as const;

// User detail response used in detail, update, and updateStatus
const userDetailResponseProperties = {
    userId: { type: 'string' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    avatar: { type: 'string' },
    status: statusEnum,
    roles: rolesArray,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    deletedAt: { type: 'string', format: 'date-time', nullable: true },
} as const;

const userDetailResponse = {
    type: 'object',
    required: ['userId', 'email', 'status', 'roles', 'createdAt', 'updatedAt'],
    properties: userDetailResponseProperties,
} as const;

// Common error responses
const error400 = { 400: errorResponse } as const;
const error403 = { 403: errorResponse } as const;
const error404 = { 404: errorResponse } as const;

// ============================================
// Admin Users Schemas
// ============================================

export const adminUsersSchemas = {
    create: {
        security: securityBearer,
        body: {
            type: 'object',
            required: ['email', 'password', 'roles'],
            additionalProperties: false,
            properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 12 },
                roles: rolesArrayMinOne,
                status: statusEnum,
                name: { type: 'string' },
                avatar: { type: 'string' },
            },
        },
        response: {
            201: {
                type: 'object',
                required: ['userId'],
                properties: {
                    userId: { type: 'string' },
                },
            },
            ...error400,
            ...error403,
        },
    },
    list: {
        security: securityBearer,
        querystring: {
            type: 'object',
            additionalProperties: false,
            properties: {
                status: statusEnum,
                role: rolesEnum,
                page: { type: 'integer', minimum: 1 },
                pageSize: { type: 'integer', minimum: 1 },
            },
        },
        response: {
            200: {
                type: 'object',
                required: ['items', 'page', 'pageSize', 'total'],
                properties: {
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['userId', 'email', 'status', 'roles', 'createdAt'],
                            properties: {
                                userId: { type: 'string' },
                                email: { type: 'string', format: 'email' },
                                name: { type: 'string' },
                                avatar: { type: 'string' },
                                status: statusEnum,
                                roles: rolesArray,
                                createdAt: { type: 'string', format: 'date-time' },
                            },
                        },
                    },
                    page: { type: 'integer' },
                    pageSize: { type: 'integer' },
                    total: { type: 'integer' },
                },
            },
            ...error400,
            ...error403,
        },
    },
    detail: {
        security: securityBearer,
        params: userIdParams,
        response: {
            200: userDetailResponse,
            ...error403,
            ...error404,
        },
    },
    update: {
        security: securityBearer,
        params: userIdParams,
        body: {
            type: 'object',
            additionalProperties: false,
            properties: {
                roles: rolesArray,
                status: statusEnum,
                name: { type: 'string' },
                avatar: { type: 'string' },
            },
        },
        response: {
            200: userDetailResponse,
            ...error400,
            ...error403,
            ...error404,
        },
    },
    updateStatus: {
        security: securityBearer,
        params: userIdParams,
        body: {
            type: 'object',
            required: ['status'],
            additionalProperties: false,
            properties: {
                status: statusEnum,
            },
        },
        response: {
            200: userDetailResponse,
            ...error400,
            ...error403,
            ...error404,
        },
    },
    softDelete: {
        security: securityBearer,
        params: userIdParams,
        response: {
            204: { type: 'null' },
            ...error400,
            ...error403,
            ...error404,
        },
    },
    revokeSessions: {
        security: securityBearer,
        params: userIdParams,
        response: {
            204: { type: 'null' },
            ...error400,
            ...error403,
            ...error404,
        },
    },
    changePassword: {
        security: securityBearer,
        params: userIdParams,
        body: {
            type: 'object',
            required: ['newPassword'],
            additionalProperties: false,
            properties: {
                newPassword: { type: 'string', minLength: 12 },
            },
        },
        response: {
            204: { type: 'null' },
            ...error400,
            ...error403,
            ...error404,
        },
    },
};
