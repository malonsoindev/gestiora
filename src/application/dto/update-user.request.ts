import type { UserRole } from '../../domain/value-objects/user-role.value-object.js';
import type { UserStatus } from '../../domain/entities/user.entity.js';

export type UpdateUserRequest = {
    userId: string;
    name?: string;
    avatar?: string;
    roles?: UserRole[];
    status?: UserStatus;
};
