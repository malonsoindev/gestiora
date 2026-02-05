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
                                required: ['id', 'concepto', 'cantidad', 'precio', 'total'],
                                additionalProperties: false,
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
};
