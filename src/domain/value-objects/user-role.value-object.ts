export type UserRoleValue = 'USER' | 'ADMIN';

export class UserRole {
    private constructor(private readonly value: UserRoleValue) {}

    static create(value: UserRoleValue): UserRole {
        return new UserRole(value);
    }

    static user(): UserRole {
        return new UserRole('USER');
    }

    static admin(): UserRole {
        return new UserRole('ADMIN');
    }

    getValue(): UserRoleValue {
        return this.value;
    }

    equals(other: UserRole): boolean {
        return this.value === other.value;
    }
}
