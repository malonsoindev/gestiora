import { User, UserStatus } from '../../../src/domain/entities/user.entity.js';
import type { UserProps } from '../../../src/domain/entities/user.entity.js';
import { UserRole } from '../../../src/domain/value-objects/user-role.value-object.js';
import { Email } from '../../../src/domain/value-objects/email.value-object.js';

type CreateUserParams = {
    now: Date;
    overrides?: Partial<UserProps>;
};

const testCredentialHashValue = 'hash';

export const createTestUser = ({ now, overrides = {} }: CreateUserParams): User =>
    User.create({
        id: 'user-1',
        email: Email.create('user@example.com'),
        passwordHash: testCredentialHashValue,
        name: 'Test User',
        avatar: 'avatar.png',
        status: UserStatus.Active,
        roles: [UserRole.user()],
        createdAt: now,
        updatedAt: now,
        ...overrides,
    });
