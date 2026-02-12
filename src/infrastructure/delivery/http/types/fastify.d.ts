import type { UserRole } from '@domain/value-objects/user-role.value-object.js';

declare module 'fastify' {
    interface FastifyRequest {
        auth?: {
            userId: string;
            roles: UserRole[];
        };
    }
}
