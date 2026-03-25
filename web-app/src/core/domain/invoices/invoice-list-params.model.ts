import { InvoiceSummary } from './invoice.model';

export interface InvoiceListParams {
  providerId?: string;
  fromDate?: string;
  toDate?: string;
  minTotal?: number;
  maxTotal?: number;
  page?: number;
  pageSize?: number;
}

export interface InvoiceListResponse {
  items: InvoiceSummary[];
  page?: number;
  pageSize?: number;
  total?: number;
}
