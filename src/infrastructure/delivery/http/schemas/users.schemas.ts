import {
    securityBearer,
    error400,
    error401,
    error404,
    response204,
} from './shared-schemas.js';

export const usersSchemas = {
    updateOwnProfile: {
        security: securityBearer,
        body: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: { type: 'string' },
                avatar: { type: 'string' },
            },
        },
        response: {
            ...response204,
            ...error401,
            ...error404,
        },
    },
    changeOwnPassword: {
        security: securityBearer,
        body: {
            type: 'object',
            required: ['currentPassword', 'newPassword'],
            additionalProperties: false,
            properties: {
                currentPassword: { type: 'string' },
                newPassword: { type: 'string', minLength: 12 },
            },
        },
        response: {
            ...response204,
            ...error400,
            ...error401,
            ...error404,
        },
    },
};
