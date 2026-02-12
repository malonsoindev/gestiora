import type { UserRole } from '@domain/value-objects/user-role.value-object.js';
import type { UserStatus } from '@domain/entities/user.entity.js';

export type CreateUserRequest = {
    actorUserId: string;
    email: string;
    password: string;
    roles: UserRole[];
    status?: UserStatus;
    name?: string;
    avatar?: string;
};
