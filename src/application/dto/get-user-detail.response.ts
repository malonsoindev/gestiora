import type { UserRole } from '../../domain/value-objects/user-role.value-object.js';
import type { UserStatus } from '../../domain/entities/user.entity.js';

export type GetUserDetailResponse = {
    userId: string;
    email: string;
    name?: string;
    avatar?: string;
    status: UserStatus;
    roles: UserRole[];
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
};
