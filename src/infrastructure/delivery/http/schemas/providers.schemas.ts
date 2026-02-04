export const providersSchemas = {
    create: {
        security: [{ bearerAuth: [] }],
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
                status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED', 'DRAFT'] },
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
            400: {
                type: 'object',
                required: ['error'],
                properties: {
                    error: { type: 'string' },
                },
            },
            401: {
                type: 'object',
                required: ['error'],
                properties: {
                    error: { type: 'string' },
                },
            },
        },
    },
    list: {
        security: [{ bearerAuth: [] }],
        querystring: {
            type: 'object',
            additionalProperties: false,
            properties: {
                status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED', 'DRAFT'] },
                q: { type: 'string' },
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
                            required: ['providerId', 'razonSocial', 'status'],
                            properties: {
                                providerId: { type: 'string' },
                                razonSocial: { type: 'string' },
                                status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED', 'DRAFT'] },
                            },
                        },
                    },
                    page: { type: 'integer' },
                    pageSize: { type: 'integer' },
                    total: { type: 'integer' },
                },
            },
            401: {
                type: 'object',
                required: ['error'],
                properties: {
                    error: { type: 'string' },
                },
            },
        },
    },
    detail: {
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            required: ['providerId'],
            properties: {
                providerId: { type: 'string' },
            },
        },
        response: {
            200: {
                type: 'object',
                required: ['providerId', 'razonSocial', 'status', 'createdAt', 'updatedAt'],
                properties: {
                    providerId: { type: 'string' },
                    razonSocial: { type: 'string' },
                    cif: { type: 'string' },
                    direccion: { type: 'string' },
                    poblacion: { type: 'string' },
                    provincia: { type: 'string' },
                    pais: { type: 'string' },
                    status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED', 'DRAFT'] },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    deletedAt: { type: 'string', format: 'date-time', nullable: true },
                },
            },
            401: {
                type: 'object',
                required: ['error'],
                properties: {
                    error: { type: 'string' },
                },
            },
            404: {
                type: 'object',
                required: ['error'],
                properties: {
                    error: { type: 'string' },
                },
            },
        },
    },
    update: {
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            required: ['providerId'],
            properties: {
                providerId: { type: 'string' },
            },
        },
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
            200: {
                type: 'object',
                required: ['providerId', 'razonSocial', 'status', 'createdAt', 'updatedAt'],
                properties: {
                    providerId: { type: 'string' },
                    razonSocial: { type: 'string' },
                    cif: { type: 'string' },
                    direccion: { type: 'string' },
                    poblacion: { type: 'string' },
                    provincia: { type: 'string' },
                    pais: { type: 'string' },
                    status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED', 'DRAFT'] },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    deletedAt: { type: 'string', format: 'date-time', nullable: true },
                },
            },
            400: {
                type: 'object',
                required: ['error'],
                properties: {
                    error: { type: 'string' },
                },
            },
            401: {
                type: 'object',
                required: ['error'],
                properties: {
                    error: { type: 'string' },
                },
            },
            404: {
                type: 'object',
                required: ['error'],
                properties: {
                    error: { type: 'string' },
                },
            },
        },
    },
    updateStatus: {
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            required: ['providerId'],
            properties: {
                providerId: { type: 'string' },
            },
        },
        body: {
            type: 'object',
            required: ['status'],
            additionalProperties: false,
            properties: {
                status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED', 'DRAFT'] },
            },
        },
        response: {
            200: {
                type: 'object',
                required: ['providerId', 'razonSocial', 'status', 'createdAt', 'updatedAt'],
                properties: {
                    providerId: { type: 'string' },
                    razonSocial: { type: 'string' },
                    cif: { type: 'string' },
                    direccion: { type: 'string' },
                    poblacion: { type: 'string' },
                    provincia: { type: 'string' },
                    pais: { type: 'string' },
                    status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED', 'DRAFT'] },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    deletedAt: { type: 'string', format: 'date-time', nullable: true },
                },
            },
            400: {
                type: 'object',
                required: ['error'],
                properties: {
                    error: { type: 'string' },
                },
            },
            401: {
                type: 'object',
                required: ['error'],
                properties: {
                    error: { type: 'string' },
                },
            },
            404: {
                type: 'object',
                required: ['error'],
                properties: {
                    error: { type: 'string' },
                },
            },
        },
    },
};
