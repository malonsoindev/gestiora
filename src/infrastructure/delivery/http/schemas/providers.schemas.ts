import {
    securityBearer,
    error400,
    error401,
    error404,
    response204,
    paginationQueryProperties,
    paginationResponseProperties,
    providerStatusEnum,
    providerIdParams,
    providerDetailResponse,
} from './shared-schemas.js';

export const providersSchemas = {
    create: {
        security: securityBearer,
        body: {
            type: 'object',
            required: ['razonSocial'],
            additionalProperties: false,
            properties: {
                razonSocial: { type: 'string' },
                cif: { type: 'string' },
                direccion: { type: 'string' },
                poblacion: { type: 'string' },
                provincia: { type: 'string' },
                pais: { type: 'string' },
                status: providerStatusEnum,
            },
        },
        response: {
            201: {
                type: 'object',
                required: ['providerId'],
                properties: {
                    providerId: { type: 'string' },
                },
            },
            ...error400,
            ...error401,
        },
    },
    list: {
        security: securityBearer,
        querystring: {
            type: 'object',
            additionalProperties: false,
            properties: {
                status: providerStatusEnum,
                q: { type: 'string' },
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
                            required: ['providerId', 'razonSocial', 'status'],
                            properties: {
                                providerId: { type: 'string' },
                                razonSocial: { type: 'string' },
                                status: providerStatusEnum,
                            },
                        },
                    },
                    ...paginationResponseProperties,
                },
            },
            ...error401,
        },
    },
    detail: {
        security: securityBearer,
        params: providerIdParams,
        response: {
            200: providerDetailResponse,
            ...error401,
            ...error404,
        },
    },
    update: {
        security: securityBearer,
        params: providerIdParams,
        body: {
            type: 'object',
            additionalProperties: false,
            properties: {
                razonSocial: { type: 'string' },
                cif: { type: 'string' },
                direccion: { type: 'string' },
                poblacion: { type: 'string' },
                provincia: { type: 'string' },
                pais: { type: 'string' },
            },
        },
        response: {
            200: providerDetailResponse,
            ...error400,
            ...error401,
            ...error404,
        },
    },
    updateStatus: {
        security: securityBearer,
        params: providerIdParams,
        body: {
            type: 'object',
            required: ['status'],
            additionalProperties: false,
            properties: {
                status: providerStatusEnum,
            },
        },
        response: {
            200: providerDetailResponse,
            ...error400,
            ...error401,
            ...error404,
        },
    },
    softDelete: {
        security: securityBearer,
        params: providerIdParams,
        response: {
            ...response204,
            ...error401,
            ...error404,
        },
    },
};
