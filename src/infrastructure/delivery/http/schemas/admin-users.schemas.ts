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
                status: { type: 'string', enum: ['ACTIVO', 'INACTIVO', 'ELIMINADO'] },
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
};
