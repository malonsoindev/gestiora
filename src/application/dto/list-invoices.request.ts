export type ListInvoicesRequest = {
    status?: 'DRAFT' | 'ACTIVE' | 'INCONSISTENT' | 'DELETED';
    providerId?: string;
    page: number;
    pageSize: number;
};
