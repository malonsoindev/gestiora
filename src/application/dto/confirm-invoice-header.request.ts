export type ConfirmInvoiceHeaderRequest = {
    actorUserId: string;
    invoiceId: string;
    fields: {
        numeroFactura?: { action: 'CONFIRM' | 'CORRECT'; value?: string };
        fechaOperacion?: { action: 'CONFIRM' | 'CORRECT'; value?: string };
        fechaVencimiento?: { action: 'CONFIRM' | 'CORRECT'; value?: string };
        baseImponible?: { action: 'CONFIRM' | 'CORRECT'; value?: number };
        iva?: { action: 'CONFIRM' | 'CORRECT'; value?: number };
        total?: { action: 'CONFIRM' | 'CORRECT'; value?: number };
    };
};
