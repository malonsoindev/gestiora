import type { UserRole } from '@domain/value-objects/user-role.value-object.js';
import type { UserStatus } from '@domain/entities/user.entity.js';

export type UserSummary = {
    userId: string;
    email: string;
    name?: string;
    avatar?: string;
    status: UserStatus;
    roles: UserRole[];
    createdAt: Date;
};

export type ListUsersResponse = {
    items: UserSummary[];
    page: number;
    pageSize: number;
    total: number;
};
