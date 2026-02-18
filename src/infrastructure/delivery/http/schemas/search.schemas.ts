import {
    securityBearer,
    error400,
    error401,
    error404,
} from './shared-schemas.js';

const searchResultResponseProperties = {
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
} as const;

const searchResultResponse = {
    type: 'object',
    required: ['answer', 'references'],
    properties: searchResultResponseProperties,
} as const;

export const searchSchemas = {
    search: {
        security: securityBearer,
        body: {
            type: 'object',
            required: ['query'],
            additionalProperties: false,
            properties: {
                query: { type: 'string' },
            },
        },
        response: {
            200: searchResultResponse,
            ...error400,
            ...error401,
        },
    },
    getById: {
        security: securityBearer,
        params: {
            type: 'object',
            required: ['queryId'],
            additionalProperties: false,
            properties: {
                queryId: { type: 'string' },
            },
        },
        response: {
            200: searchResultResponse,
            ...error401,
            ...error404,
        },
    },
};
