export enum InvoiceMovementSource {
    Manual = 'MANUAL',
    Ai = 'AI',
}

export enum InvoiceMovementStatus {
    Proposed = 'PROPOSED',
    Confirmed = 'CONFIRMED',
    Rejected = 'REJECTED',
}

export type InvoiceMovementProps = {
    id: string;
    concepto: string;
    cantidad: number;
    precio: number;
    baseImponible?: number;
    iva?: number;
    total: number;
    source?: InvoiceMovementSource;
    status?: InvoiceMovementStatus;
};

export class InvoiceMovement {
    private constructor(private readonly props: InvoiceMovementProps) {}

    static create(props: InvoiceMovementProps): InvoiceMovement {
        return new InvoiceMovement({
            ...props,
            source: props.source ?? InvoiceMovementSource.Manual,
            status: props.status ?? InvoiceMovementStatus.Confirmed,
        });
    }

    get id(): string {
        return this.props.id;
    }

    get concepto(): string {
        return this.props.concepto;
    }

    get cantidad(): number {
        return this.props.cantidad;
    }

    get precio(): number {
        return this.props.precio;
    }

    get baseImponible(): number | undefined {
        return this.props.baseImponible;
    }

    get iva(): number | undefined {
        return this.props.iva;
    }

    get total(): number {
        return this.props.total;
    }

    get source(): InvoiceMovementSource {
        return this.props.source ?? InvoiceMovementSource.Manual;
    }

    get status(): InvoiceMovementStatus {
        return this.props.status ?? InvoiceMovementStatus.Confirmed;
    }
}
