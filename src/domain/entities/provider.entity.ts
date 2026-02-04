import type { Cif } from '../value-objects/cif.value-object.js';

export enum ProviderStatus {
    Active = 'ACTIVE',
    Inactive = 'INACTIVE',
    Deleted = 'DELETED',
    Draft = 'DRAFT',
}

export type ProviderProps = {
    id: string;
    razonSocial: string;
    cif?: Cif;
    direccion?: string;
    poblacion?: string;
    provincia?: string;
    pais?: string;
    status: ProviderStatus;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
};

export class Provider {
    private constructor(private readonly props: ProviderProps) {}

    static create(props: ProviderProps): Provider {
        return new Provider({ ...props });
    }

    get id(): string {
        return this.props.id;
    }

    get razonSocial(): string {
        return this.props.razonSocial;
    }

    get cif(): string | undefined {
        return this.props.cif?.getValue();
    }

    get direccion(): string | undefined {
        return this.props.direccion;
    }

    get poblacion(): string | undefined {
        return this.props.poblacion;
    }

    get provincia(): string | undefined {
        return this.props.provincia;
    }

    get pais(): string | undefined {
        return this.props.pais;
    }

    get status(): ProviderStatus {
        return this.props.status;
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

    updateInfo(update: {
        razonSocial?: string;
        cif?: Cif;
        direccion?: string;
        poblacion?: string;
        provincia?: string;
        pais?: string;
        status?: ProviderStatus;
        deletedAt?: Date;
        updatedAt: Date;
    }): Provider {
        const next: ProviderProps = {
            id: this.props.id,
            razonSocial: update.razonSocial ?? this.props.razonSocial,
            status: update.status ?? this.props.status,
            createdAt: this.props.createdAt,
            updatedAt: update.updatedAt,
        };

        const cif = update.cif ?? this.props.cif;
        if (cif) {
            next.cif = cif;
        }

        const direccion = update.direccion ?? this.props.direccion;
        if (direccion !== undefined) {
            next.direccion = direccion;
        }

        const poblacion = update.poblacion ?? this.props.poblacion;
        if (poblacion !== undefined) {
            next.poblacion = poblacion;
        }

        const provincia = update.provincia ?? this.props.provincia;
        if (provincia !== undefined) {
            next.provincia = provincia;
        }

        const pais = update.pais ?? this.props.pais;
        if (pais !== undefined) {
            next.pais = pais;
        }

        const deletedAt = update.deletedAt ?? this.props.deletedAt;
        if (deletedAt !== undefined) {
            next.deletedAt = deletedAt;
        }

        return Provider.create(next);
    }
}
