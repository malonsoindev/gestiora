import type { InvoiceMovement } from './invoice-movement.entity.js';
import type { FileRef } from '../value-objects/file-ref.value-object.js';
import type { InvoiceDate } from '../value-objects/invoice-date.value-object.js';
import type { Money } from '../value-objects/money.value-object.js';

export enum InvoiceStatus {
    Draft = 'DRAFT',
    Active = 'ACTIVO',
    Deleted = 'ELIMINADO',
}

export type InvoiceProps = {
    id: string;
    providerId: string;
    status: InvoiceStatus;
    numeroFactura?: string;
    fechaOperacion?: InvoiceDate;
    fechaVencimiento?: InvoiceDate;
    baseImponible?: Money;
    iva?: Money;
    total?: Money;
    fileRef?: FileRef;
    movements: InvoiceMovement[];
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
};

export class Invoice {
    private constructor(private readonly props: InvoiceProps) {}

    static create(props: InvoiceProps): Invoice {
        return new Invoice({ ...props, movements: [...props.movements] });
    }

    get id(): string {
        return this.props.id;
    }

    get providerId(): string {
        return this.props.providerId;
    }

    get status(): InvoiceStatus {
        return this.props.status;
    }

    get numeroFactura(): string | undefined {
        return this.props.numeroFactura;
    }

    get fechaOperacion(): string | undefined {
        return this.props.fechaOperacion?.getValue();
    }

    get fechaVencimiento(): string | undefined {
        return this.props.fechaVencimiento?.getValue();
    }

    get baseImponible(): number | undefined {
        return this.props.baseImponible?.getValue();
    }

    get iva(): number | undefined {
        return this.props.iva?.getValue();
    }

    get total(): number | undefined {
        return this.props.total?.getValue();
    }

    get fileRef(): FileRef | undefined {
        return this.props.fileRef;
    }

    get movements(): InvoiceMovement[] {
        return [...this.props.movements];
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

    attachFileRef(fileRef: FileRef, updatedAt: Date): Invoice {
        return Invoice.create({
            ...this.props,
            fileRef,
            status: InvoiceStatus.Active,
            updatedAt,
        });
    }

    updateDetails(update: {
        numeroFactura?: string;
        fechaOperacion?: InvoiceDate;
        fechaVencimiento?: InvoiceDate;
        baseImponible?: Money;
        iva?: Money;
        total?: Money;
        movements?: InvoiceMovement[];
        updatedAt: Date;
    }): Invoice {
        const next: InvoiceProps = {
            id: this.props.id,
            providerId: this.props.providerId,
            status: this.props.status,
            movements: update.movements ?? this.props.movements,
            createdAt: this.props.createdAt,
            updatedAt: update.updatedAt,
        };

        const numeroFactura = update.numeroFactura ?? this.props.numeroFactura;
        if (numeroFactura !== undefined) {
            next.numeroFactura = numeroFactura;
        }

        const fechaOperacion = update.fechaOperacion ?? this.props.fechaOperacion;
        if (fechaOperacion !== undefined) {
            next.fechaOperacion = fechaOperacion;
        }

        const fechaVencimiento = update.fechaVencimiento ?? this.props.fechaVencimiento;
        if (fechaVencimiento !== undefined) {
            next.fechaVencimiento = fechaVencimiento;
        }

        const baseImponible = update.baseImponible ?? this.props.baseImponible;
        if (baseImponible !== undefined) {
            next.baseImponible = baseImponible;
        }

        const iva = update.iva ?? this.props.iva;
        if (iva !== undefined) {
            next.iva = iva;
        }

        const total = update.total ?? this.props.total;
        if (total !== undefined) {
            next.total = total;
        }

        if (this.props.fileRef !== undefined) {
            next.fileRef = this.props.fileRef;
        }

        if (this.props.deletedAt !== undefined) {
            next.deletedAt = this.props.deletedAt;
        }

        return Invoice.create(next);
    }

    markDeleted(deletedAt: Date): Invoice {
        return Invoice.create({
            ...this.props,
            status: InvoiceStatus.Deleted,
            deletedAt,
            updatedAt: deletedAt,
        });
    }
}
