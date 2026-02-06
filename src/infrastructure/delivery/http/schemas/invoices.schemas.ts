export const invoicesSchemas = {
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
                    status: { type: 'string', enum: ['DRAFT', 'ACTIVO', 'ELIMINADO'] },
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
                            required: ['id', 'concepto', 'cantidad', 'precio', 'total'],
                            properties: {
                                id: { type: 'string' },
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
