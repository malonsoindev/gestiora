import { Observable } from 'rxjs';
import { InvoiceListParams, InvoiceListResponse } from './invoice-list-params.model';

export interface IInvoicesPort {
  getInvoices(params: InvoiceListParams): Observable<InvoiceListResponse>;
}
