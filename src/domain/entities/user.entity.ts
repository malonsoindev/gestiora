import { UserRole } from '../value-objects/user-role.value-object.js';
import type { Email } from '../value-objects/email.value-object.js';

// Por ahora usamos enum por simplicidad; si aparecen reglas de transicion o invariantes,
// se evaluara migrar a un Value Object para encapsular la logica.
export enum UserStatus {
    Active = 'ACTIVE',
    Inactive = 'INACTIVE',
    Deleted = 'DELETED',
}

// Usamos un objeto de props para simplificar el constructor, facilitar tests/serializacion
// y mantener la entidad con un estado interno controlado.
export type UserProps = {
    id: string;
    email: Email;
    passwordHash: string;
    name?: string;
    avatar?: string;
    status: UserStatus;
    lockedUntil?: Date;
    roles: UserRole[];
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
};

/**
 * Entidad de dominio con estado interno inmutable.
 * Patrón: Factory Method + props. El constructor es privado y la creacion se
 * centraliza en create() para validar invariantes, facilitar tests/serializacion
 * y mantener el control del estado interno.
 */
export class User {
    private constructor(private readonly props: UserProps) {}

    static create(props: UserProps): User {
        return new User({ ...props });
    }

    get id(): string {
        return this.props.id;
    }

    get email(): string {
        return this.props.email.getValue();
    }

    get passwordHash(): string {
        return this.props.passwordHash;
    }

    get name(): string | undefined {
        return this.props.name;
    }

    get avatar(): string | undefined {
        return this.props.avatar;
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

    get deletedAt(): Date | undefined {
        return this.props.deletedAt;
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

    updateInfo(update: {
        name?: string;
        avatar?: string;
        roles?: UserRole[];
        status?: UserStatus;
        deletedAt?: Date;
        updatedAt: Date;
    }): User {
        return User.create({
            ...this.props,
            roles: update.roles ?? this.props.roles,
            status: update.status ?? this.props.status,
            updatedAt: update.updatedAt,
            ...(update.name !== undefined ? { name: update.name } : {}),
            ...(update.avatar !== undefined ? { avatar: update.avatar } : {}),
            ...(update.deletedAt !== undefined ? { deletedAt: update.deletedAt } : {}),
        });
    }
}
