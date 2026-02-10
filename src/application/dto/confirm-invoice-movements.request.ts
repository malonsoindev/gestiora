export type ConfirmInvoiceMovementsRequest = {
    actorUserId: string;
    invoiceId: string;
    movements: Array<{
        id: string;
        action: 'CONFIRM' | 'CORRECT' | 'REJECT';
        concepto?: string;
        cantidad?: number;
        precio?: number;
        baseImponible?: number;
        iva?: number;
        total?: number;
    }>;
};
