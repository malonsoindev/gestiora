import {
    securityBearer,
    error400,
    error403,
    error404,
    response204,
    paginationQueryProperties,
    paginationResponseProperties,
    dateTimeField,
    userStatusEnum,
    userRolesEnum,
    userRolesArray,
    userRolesArrayMinOne,
    userIdParams,
    userDetailResponse,
} from './shared-schemas.js';

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
                roles: userRolesArrayMinOne,
                status: userStatusEnum,
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
                status: userStatusEnum,
                role: userRolesEnum,
                ...paginationQueryProperties,
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
                                status: userStatusEnum,
                                roles: userRolesArray,
                                createdAt: dateTimeField,
                            },
                        },
                    },
                    ...paginationResponseProperties,
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
                roles: userRolesArray,
                status: userStatusEnum,
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
                status: userStatusEnum,
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
            ...response204,
            ...error400,
            ...error403,
            ...error404,
        },
    },
    revokeSessions: {
        security: securityBearer,
        params: userIdParams,
        response: {
            ...response204,
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
            ...response204,
            ...error400,
            ...error403,
            ...error404,
        },
    },
};
