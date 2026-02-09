export const invoicesSchemas = {
    list: {
        security: [{ bearerAuth: [] }],
        querystring: {
            type: 'object',
            additionalProperties: false,
            properties: {
                status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'INCONSISTENT', 'DELETED'] },
                providerId: { type: 'string' },
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
                            required: ['invoiceId', 'providerId', 'status', 'createdAt'],
                            properties: {
                                invoiceId: { type: 'string' },
                                providerId: { type: 'string' },
                                status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'INCONSISTENT', 'DELETED'] },
                                createdAt: { type: 'string', format: 'date-time' },
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
    upload: {
        security: [{ bearerAuth: [] }],
        response: {
            201: {
                type: 'object',
                required: ['invoiceId'],
                properties: {
                    invoiceId: { type: 'string' },
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
    detail: {
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            required: ['invoiceId'],
            properties: {
                invoiceId: { type: 'string' },
            },
        },
        response: {
            200: {
                type: 'object',
                required: ['invoiceId', 'providerId', 'status', 'createdAt', 'updatedAt', 'movements'],
                properties: {
                    invoiceId: { type: 'string' },
                    providerId: { type: 'string' },
                    status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'INCONSISTENT', 'DELETED'] },
                    fileRef: {
                        type: 'object',
                        required: ['storageKey', 'filename', 'mimeType', 'sizeBytes', 'checksum'],
                        properties: {
                            storageKey: { type: 'string' },
                            filename: { type: 'string' },
                            mimeType: { type: 'string' },
                            sizeBytes: { type: 'integer' },
                            checksum: { type: 'string' },
                        },
                    },
                    numeroFactura: { type: 'string' },
                    fechaOperacion: { type: 'string' },
                    fechaVencimiento: { type: 'string' },
                    baseImponible: { type: 'number' },
                    iva: { type: 'number' },
                    total: { type: 'number' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    deletedAt: { type: 'string', format: 'date-time', nullable: true },
                    movements: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['id', 'concepto', 'cantidad', 'precio', 'total', 'source', 'status'],
                            properties: {
                                id: { type: 'string' },
                                concepto: { type: 'string' },
                                cantidad: { type: 'number' },
                                precio: { type: 'number' },
                                baseImponible: { type: 'number' },
                                iva: { type: 'number' },
                                total: { type: 'number' },
                                source: { type: 'string', enum: ['MANUAL', 'AI'] },
                                status: { type: 'string', enum: ['PROPOSED', 'CONFIRMED', 'REJECTED'] },
                            },
                        },
                    },
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
    softDelete: {
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            required: ['invoiceId'],
            properties: {
                invoiceId: { type: 'string' },
            },
        },
        response: {
            204: { type: 'null' },
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
    file: {
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            required: ['invoiceId'],
            properties: {
                invoiceId: { type: 'string' },
            },
        },
        response: {
            200: { type: 'string' },
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
    createManual: {
        security: [{ bearerAuth: [] }],
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
                        numeroFactura: { type: 'string' },
                        fechaOperacion: { type: 'string' },
                        fechaVencimiento: { type: 'string' },
                        baseImponible: { type: 'number' },
                        iva: { type: 'number' },
                        total: { type: 'number' },
                        movements: {
                            type: 'array',
                            minItems: 1,
                            items: {
                                type: 'object',
                                required: ['concepto', 'cantidad', 'precio', 'total'],
                                additionalProperties: false,
                                properties: {
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
    attachFile: {
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            required: ['invoiceId'],
            properties: {
                invoiceId: { type: 'string' },
            },
        },
        response: {
            200: {
                type: 'object',
                required: ['invoiceId', 'providerId', 'status', 'fileRef', 'createdAt', 'updatedAt', 'movements'],
                properties: {
                    invoiceId: { type: 'string' },
                    providerId: { type: 'string' },
                    status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'INCONSISTENT', 'DELETED'] },
                    fileRef: {
                        type: 'object',
                        required: ['storageKey', 'filename', 'mimeType', 'sizeBytes', 'checksum'],
                        properties: {
                            storageKey: { type: 'string' },
                            filename: { type: 'string' },
                            mimeType: { type: 'string' },
                            sizeBytes: { type: 'integer' },
                            checksum: { type: 'string' },
                        },
                    },
                    numeroFactura: { type: 'string' },
                    fechaOperacion: { type: 'string' },
                    fechaVencimiento: { type: 'string' },
                    baseImponible: { type: 'number' },
                    iva: { type: 'number' },
                    total: { type: 'number' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    deletedAt: { type: 'string', format: 'date-time', nullable: true },
                    movements: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['id', 'concepto', 'cantidad', 'precio', 'total', 'source', 'status'],
                            properties: {
                                id: { type: 'string' },
                                concepto: { type: 'string' },
                                cantidad: { type: 'number' },
                                precio: { type: 'number' },
                                baseImponible: { type: 'number' },
                                iva: { type: 'number' },
                                total: { type: 'number' },
                                source: { type: 'string', enum: ['MANUAL', 'AI'] },
                                status: { type: 'string', enum: ['PROPOSED', 'CONFIRMED', 'REJECTED'] },
                            },
                        },
                    },
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
    updateManual: {
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            required: ['invoiceId'],
            properties: {
                invoiceId: { type: 'string' },
            },
        },
        body: {
            type: 'object',
            required: ['movements'],
            additionalProperties: false,
            properties: {
                numeroFactura: { type: 'string' },
                fechaOperacion: { type: 'string' },
                fechaVencimiento: { type: 'string' },
                baseImponible: { type: 'number' },
                iva: { type: 'number' },
                total: { type: 'number' },
                movements: {
                    type: 'array',
                    minItems: 1,
                    items: {
                        type: 'object',
                        required: ['concepto', 'cantidad', 'precio', 'total'],
                        additionalProperties: false,
                        properties: {
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
                required: ['invoiceId', 'providerId', 'status', 'createdAt', 'updatedAt', 'movements'],
                properties: {
                    invoiceId: { type: 'string' },
                    providerId: { type: 'string' },
                    status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'INCONSISTENT', 'DELETED'] },
                    fileRef: {
                        type: 'object',
                        required: ['storageKey', 'filename', 'mimeType', 'sizeBytes', 'checksum'],
                        properties: {
                            storageKey: { type: 'string' },
                            filename: { type: 'string' },
                            mimeType: { type: 'string' },
                            sizeBytes: { type: 'integer' },
                            checksum: { type: 'string' },
                        },
                    },
                    numeroFactura: { type: 'string' },
                    fechaOperacion: { type: 'string' },
                    fechaVencimiento: { type: 'string' },
                    baseImponible: { type: 'number' },
                    iva: { type: 'number' },
                    total: { type: 'number' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    deletedAt: { type: 'string', format: 'date-time', nullable: true },
                    movements: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['id', 'concepto', 'cantidad', 'precio', 'total', 'source', 'status'],
                            properties: {
                                id: { type: 'string' },
                                concepto: { type: 'string' },
                                cantidad: { type: 'number' },
                                precio: { type: 'number' },
                                baseImponible: { type: 'number' },
                                iva: { type: 'number' },
                                total: { type: 'number' },
                                source: { type: 'string', enum: ['MANUAL', 'AI'] },
                                status: { type: 'string', enum: ['PROPOSED', 'CONFIRMED', 'REJECTED'] },
                            },
                        },
                    },
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
    confirmMovements: {
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            required: ['invoiceId'],
            properties: {
                invoiceId: { type: 'string' },
            },
        },
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
