export const authSchemas = {
    login: {
        body: {
            type: 'object',
            required: ['email', 'password'],
            additionalProperties: false,
            properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 12 },
            },
        },
        response: {
            400: {
                type: 'object',
                required: ['error', 'message'],
                properties: {
                    error: { type: 'string' },
                    message: { type: 'string' },
                },
            },
            200: {
                type: 'object',
                required: ['accessToken', 'refreshToken', 'expiresIn'],
                properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'number' },
                },
            },
            401: {
                type: 'object',
                required: ['error'],
                properties: {
                    error: { type: 'string' },
                },
            },
            429: {
                type: 'object',
                required: ['error'],
                properties: {
                    error: { type: 'string' },
                },
            },
        },
    },
    refresh: {
        body: {
            type: 'object',
            required: ['refreshToken'],
            additionalProperties: false,
            properties: {
                refreshToken: { type: 'string' },
            },
        },
        response: {
            400: {
                type: 'object',
                required: ['error', 'message'],
                properties: {
                    error: { type: 'string' },
                    message: { type: 'string' },
                },
            },
            200: {
                type: 'object',
                required: ['accessToken', 'expiresIn'],
                properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'number' },
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
    logout: {
        body: {
            type: 'object',
            required: ['refreshToken'],
            additionalProperties: false,
            properties: {
                refreshToken: { type: 'string' },
            },
        },
        response: {
            400: {
                type: 'object',
                required: ['error', 'message'],
                properties: {
                    error: { type: 'string' },
                    message: { type: 'string' },
                },
            },
            204: { type: 'null' },
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
