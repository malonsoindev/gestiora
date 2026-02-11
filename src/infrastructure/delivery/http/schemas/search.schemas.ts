export const searchSchemas = {
    search: {
        body: {
            type: 'object',
            required: ['query'],
            additionalProperties: false,
            properties: {
                query: { type: 'string' },
            },
        },
        response: {
            200: {
                type: 'object',
                required: ['answer', 'references'],
                properties: {
                    answer: { type: 'string' },
                    references: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['documentId', 'snippets'],
                            properties: {
                                documentId: { type: 'string' },
                                snippets: {
                                    type: 'array',
                                    items: { type: 'string' },
                                },
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
        },
    },
    getById: {
        params: {
            type: 'object',
            required: ['queryId'],
            additionalProperties: false,
            properties: {
                queryId: { type: 'string' },
            },
        },
        response: {
            200: {
                type: 'object',
                required: ['answer', 'references'],
                properties: {
                    answer: { type: 'string' },
                    references: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['documentId', 'snippets'],
                            properties: {
                                documentId: { type: 'string' },
                                snippets: {
                                    type: 'array',
                                    items: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
            404: {
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
