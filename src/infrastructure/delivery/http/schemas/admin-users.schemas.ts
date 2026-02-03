export const adminUsersSchemas = {
    create: {
        security: [{ bearerAuth: [] }],
        body: {
            type: 'object',
            required: ['email', 'password', 'roles'],
            additionalProperties: false,
            properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 12 },
                roles: {
                    type: 'array',
                    minItems: 1,
                    items: { type: 'string', enum: ['Usuario', 'Administrador'] },
                },
                status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED'] },
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
            400: {
                type: 'object',
                required: ['error'],
                properties: {
                    error: { type: 'string' },
                },
            },
            403: {
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
                status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED'] },
                role: { type: 'string', enum: ['Usuario', 'Administrador'] },
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
                                status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED'] },
                                roles: {
                                    type: 'array',
                                    items: { type: 'string', enum: ['Usuario', 'Administrador'] },
                                },
                                createdAt: { type: 'string', format: 'date-time' },
                            },
                        },
                    },
                    page: { type: 'integer' },
                    pageSize: { type: 'integer' },
                    total: { type: 'integer' },
                },
            },
            400: {
                type: 'object',
                required: ['error'],
                properties: {
                    error: { type: 'string' },
                },
            },
            403: {
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
            required: ['userId'],
            properties: {
                userId: { type: 'string' },
            },
        },
        response: {
            200: {
                type: 'object',
                required: ['userId', 'email', 'status', 'roles', 'createdAt', 'updatedAt'],
                properties: {
                    userId: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    name: { type: 'string' },
                    avatar: { type: 'string' },
                    status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED'] },
                    roles: {
                        type: 'array',
                        items: { type: 'string', enum: ['Usuario', 'Administrador'] },
                    },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    deletedAt: { type: 'string', format: 'date-time', nullable: true },
                },
            },
            403: {
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
            required: ['userId'],
            properties: {
                userId: { type: 'string' },
            },
        },
        body: {
            type: 'object',
            additionalProperties: false,
            properties: {
                roles: {
                    type: 'array',
                    items: { type: 'string', enum: ['Usuario', 'Administrador'] },
                },
                status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED'] },
                name: { type: 'string' },
                avatar: { type: 'string' },
            },
        },
        response: {
            200: {
                type: 'object',
                required: ['userId', 'email', 'status', 'roles', 'createdAt', 'updatedAt'],
                properties: {
                    userId: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    name: { type: 'string' },
                    avatar: { type: 'string' },
                    status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED'] },
                    roles: {
                        type: 'array',
                        items: { type: 'string', enum: ['Usuario', 'Administrador'] },
                    },
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
            403: {
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
            required: ['userId'],
            properties: {
                userId: { type: 'string' },
            },
        },
        body: {
            type: 'object',
            required: ['status'],
            additionalProperties: false,
            properties: {
                status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED'] },
            },
        },
        response: {
            200: {
                type: 'object',
                required: ['userId', 'email', 'status', 'roles', 'createdAt', 'updatedAt'],
                properties: {
                    userId: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    name: { type: 'string' },
                    avatar: { type: 'string' },
                    status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED'] },
                    roles: {
                        type: 'array',
                        items: { type: 'string', enum: ['Usuario', 'Administrador'] },
                    },
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
            403: {
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
    softDelete: {
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            required: ['userId'],
            properties: {
                userId: { type: 'string' },
            },
        },
        response: {
            204: { type: 'null' },
            403: {
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
