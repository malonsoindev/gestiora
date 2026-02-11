export type QueryInvoicesRagRequest = {
    query: string;
    filters?: {
        providerName?: string;
        dateFrom?: string;
        dateTo?: string;
        minTotal?: number;
        maxTotal?: number;
    };
};
