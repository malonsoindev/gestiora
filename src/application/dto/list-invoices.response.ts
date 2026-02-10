export type ListInvoicesResponse = {
    items: Array<{
        invoiceId: string;
        providerId: string;
        status: 'DRAFT' | 'ACTIVE' | 'INCONSISTENT' | 'DELETED';
        createdAt: Date;
    }>;
    page: number;
    pageSize: number;
    total: number;
};
