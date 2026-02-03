import type { UserStatus } from '../../domain/entities/user.entity.js';

export type UpdateUserStatusRequest = {
    userId: string;
    status: UserStatus;
};
