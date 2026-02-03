export const usersSchemas = {
    updateOwnProfile: {
        security: [{ bearerAuth: [] }],
        body: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: { type: 'string' },
                avatar: { type: 'string' },
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
};
