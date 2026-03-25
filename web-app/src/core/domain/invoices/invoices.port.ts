import { Observable } from 'rxjs';
import { InvoiceListParams, InvoiceListResponse } from './invoice-list-params.model';
import { InvoiceDetail, InvoiceUpdateRequest } from './invoice.model';

export interface IInvoicesPort {
  getInvoices(params: InvoiceListParams): Observable<InvoiceListResponse>;
  getInvoice(invoiceId: string): Observable<InvoiceDetail>;
  updateInvoice(invoiceId: string, request: InvoiceUpdateRequest): Observable<InvoiceDetail>;
  getInvoiceFile(invoiceId: string): Observable<Blob>;
}
