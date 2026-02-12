export type QueryInvoicesRagResponse = {
    answer: string;
    references: Array<{ documentId: string; snippets: string[] }>;
};
