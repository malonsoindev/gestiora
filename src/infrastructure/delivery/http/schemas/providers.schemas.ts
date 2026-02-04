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
                status: { type: 'string', enum: ['ACTIVO', 'INACTIVO', 'ELIMINADO', 'BORRADOR'] },
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
};
