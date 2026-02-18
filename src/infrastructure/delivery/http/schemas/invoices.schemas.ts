import {
    securityBearer,
    error400,
    error401,
    error404,
    response204,
    paginationQueryProperties,
    paginationResponseProperties,
    invoiceStatusEnum,
    invoiceIdParams,
    invoiceDetailResponse,
    invoiceDetailWithFileResponse,
    movementInputSchema,
    invoiceHeaderFields,
    dataSourceEnum,
} from './shared-schemas.js';

export const invoicesSchemas = {
    list: {
        security: securityBearer,
        querystring: {
            type: 'object',
            additionalProperties: false,
            properties: {
                status: invoiceStatusEnum,
                providerId: { type: 'string' },
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
                            required: ['invoiceId', 'providerId', 'status', 'createdAt'],
                            properties: {
                                invoiceId: { type: 'string' },
                                providerId: { type: 'string' },
                                status: invoiceStatusEnum,
                                createdAt: { type: 'string', format: 'date-time' },
                            },
                        },
                    },
                    ...paginationResponseProperties,
                },
            },
            ...error401,
        },
    },
    upload: {
        security: securityBearer,
        response: {
            201: {
                type: 'object',
                required: ['invoiceId'],
                properties: {
                    invoiceId: { type: 'string' },
                },
            },
            ...error400,
            ...error401,
        },
    },
    detail: {
        security: securityBearer,
        params: invoiceIdParams,
        response: {
            200: invoiceDetailResponse,
            ...error401,
            ...error404,
        },
    },
    softDelete: {
        security: securityBearer,
        params: invoiceIdParams,
        response: {
            ...response204,
            ...error401,
            ...error404,
        },
    },
    file: {
        security: securityBearer,
        params: invoiceIdParams,
        response: {
            200: { type: 'string' },
            ...error400,
            ...error401,
            ...error404,
        },
    },
    createManual: {
        security: securityBearer,
        body: {
            type: 'object',
            required: ['invoice'],
            additionalProperties: false,
            properties: {
                providerId: { type: 'string' },
                providerCif: { type: 'string' },
                invoice: {
                    type: 'object',
                    required: ['movements'],
                    additionalProperties: false,
                    properties: {
                        ...invoiceHeaderFields,
                        movements: {
                            type: 'array',
                            minItems: 1,
                            items: movementInputSchema,
                        },
                    },
                },
            },
        },
        response: {
            201: {
                type: 'object',
                required: ['invoiceId'],
                properties: {
                    invoiceId: { type: 'string' },
                },
            },
            ...error400,
            ...error401,
            ...error404,
        },
    },
    attachFile: {
        security: securityBearer,
        params: invoiceIdParams,
        response: {
            200: invoiceDetailWithFileResponse,
            ...error400,
            ...error401,
            ...error404,
        },
    },
    updateManual: {
        security: securityBearer,
        params: invoiceIdParams,
        body: {
            type: 'object',
            required: ['movements'],
            additionalProperties: false,
            properties: {
                ...invoiceHeaderFields,
                movements: {
                    type: 'array',
                    minItems: 1,
                    items: movementInputSchema,
                },
            },
        },
        response: {
            200: invoiceDetailResponse,
            ...error400,
            ...error401,
            ...error404,
        },
    },
    confirmMovements: {
        security: securityBearer,
        params: invoiceIdParams,
        body: {
            type: 'object',
            required: ['movements'],
            additionalProperties: false,
            properties: {
                movements: {
                    type: 'array',
                    minItems: 1,
                    items: {
                        type: 'object',
                        required: ['id', 'action'],
                        additionalProperties: false,
                        properties: {
                            id: { type: 'string' },
                            action: { type: 'string', enum: ['CONFIRM', 'CORRECT', 'REJECT'] },
                            concepto: { type: 'string' },
                            cantidad: { type: 'number' },
                            precio: { type: 'number' },
                            baseImponible: { type: 'number' },
                            iva: { type: 'number' },
                            total: { type: 'number' },
                        },
                    },
                },
            },
        },
        response: {
            200: {
                type: 'object',
                required: ['invoiceId'],
                properties: {
                    invoiceId: { type: 'string' },
                },
            },
            ...error400,
            ...error401,
            ...error404,
        },
    },
    confirmHeader: {
        security: securityBearer,
        params: invoiceIdParams,
        body: {
            type: 'object',
            required: ['fields'],
            additionalProperties: false,
            properties: {
                fields: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        numeroFactura: {
                            type: 'object',
                            required: ['action'],
                            additionalProperties: false,
                            properties: {
                                action: { type: 'string', enum: ['CONFIRM', 'CORRECT'] },
                                value: { type: 'string' },
                            },
                        },
                        fechaOperacion: {
                            type: 'object',
                            required: ['action'],
                            additionalProperties: false,
                            properties: {
                                action: { type: 'string', enum: ['CONFIRM', 'CORRECT'] },
                                value: { type: 'string' },
                            },
                        },
                        fechaVencimiento: {
                            type: 'object',
                            required: ['action'],
                            additionalProperties: false,
                            properties: {
                                action: { type: 'string', enum: ['CONFIRM', 'CORRECT'] },
                                value: { type: 'string' },
                            },
                        },
                        baseImponible: {
                            type: 'object',
                            required: ['action'],
                            additionalProperties: false,
                            properties: {
                                action: { type: 'string', enum: ['CONFIRM', 'CORRECT'] },
                                value: { type: 'number' },
                            },
                        },
                        iva: {
                            type: 'object',
                            required: ['action'],
                            additionalProperties: false,
                            properties: {
                                action: { type: 'string', enum: ['CONFIRM', 'CORRECT'] },
                                value: { type: 'number' },
                            },
                        },
                        total: {
                            type: 'object',
                            required: ['action'],
                            additionalProperties: false,
                            properties: {
                                action: { type: 'string', enum: ['CONFIRM', 'CORRECT'] },
                                value: { type: 'number' },
                            },
                        },
                    },
                },
            },
        },
        response: {
            200: {
                type: 'object',
                required: ['invoiceId'],
                properties: {
                    invoiceId: { type: 'string' },
                },
            },
            ...error400,
            ...error401,
            ...error404,
        },
    },
    reprocess: {
        security: securityBearer,
        params: invoiceIdParams,
        response: {
            200: {
                type: 'object',
                required: ['invoiceId'],
                properties: {
                    invoiceId: { type: 'string' },
                },
            },
            ...error400,
            ...error401,
            ...error404,
        },
    },
};
