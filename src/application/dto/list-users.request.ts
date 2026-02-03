import type { UserRole } from '../../domain/value-objects/user-role.value-object.js';
import type { UserStatus } from '../../domain/entities/user.entity.js';

export type ListUsersRequest = {
    page: number;
    pageSize: number;
    status?: UserStatus;
    role?: UserRole;
};
