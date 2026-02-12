import type { UserRole } from '@domain/value-objects/user-role.value-object.js';

export type AuthorizeResponse = {
    userId: string;
    roles: UserRole[];
};
