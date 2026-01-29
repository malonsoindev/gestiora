import { UserRole } from '../value-objects/user-role.js';

export enum UserStatus {
    Active = 'ACTIVE',
    Inactive = 'INACTIVE',
    Deleted = 'DELETED',
}

export type UserProps = {
    id: string;
    email: string;
    passwordHash: string;
    status: UserStatus;
    lockedUntil?: Date;
    roles: UserRole[];
    createdAt: Date;
    updatedAt: Date;
};

export class User {
    private constructor(private readonly props: UserProps) {}

    static create(props: UserProps): User {
        return new User({ ...props });
    }

    get id(): string {
        return this.props.id;
    }

    get email(): string {
        return this.props.email;
    }

    get passwordHash(): string {
        return this.props.passwordHash;
    }

    get status(): UserStatus {
        return this.props.status;
    }

    get lockedUntil(): Date | undefined {
        return this.props.lockedUntil;
    }

    get roles(): UserRole[] {
        return [...this.props.roles];
    }

    get createdAt(): Date {
        return this.props.createdAt;
    }

    get updatedAt(): Date {
        return this.props.updatedAt;
    }

    isActive(): boolean {
        return this.props.status === UserStatus.Active;
    }

    isLocked(referenceTime: Date): boolean {
        if (!this.props.lockedUntil) {
            return false;
        }

        return this.props.lockedUntil.getTime() > referenceTime.getTime();
    }
}
