import {
    error400WithMessage,
    error401,
    error429,
    response204,
} from './shared-schemas.js';

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
            200: {
                type: 'object',
                required: ['accessToken', 'refreshToken', 'expiresIn'],
                properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'number' },
                },
            },
            ...error400WithMessage,
            ...error401,
            ...error429,
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
            200: {
                type: 'object',
                required: ['accessToken', 'expiresIn'],
                properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'number' },
                },
            },
            ...error400WithMessage,
            ...error401,
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
            ...response204,
            ...error400WithMessage,
            ...error401,
        },
    },
};
