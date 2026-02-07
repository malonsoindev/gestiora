export type InvoiceMovementProps = {
    id: string;
    concepto: string;
    cantidad: number;
    precio: number;
    baseImponible?: number;
    iva?: number;
    total: number;
};

export class InvoiceMovement {
    private constructor(private readonly props: InvoiceMovementProps) {}

    static create(props: InvoiceMovementProps): InvoiceMovement {
        return new InvoiceMovement({ ...props });
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
}
