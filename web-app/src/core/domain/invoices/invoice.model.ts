export type InvoiceStatus = 'DRAFT' | 'ACTIVE' | 'INCONSISTENT' | 'DELETED';

export interface InvoiceSummary {
  invoiceId: string;
  providerId: string;
  status: InvoiceStatus;
  createdAt: string;
}
