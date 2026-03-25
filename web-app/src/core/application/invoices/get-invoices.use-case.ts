import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { INVOICES_PORT } from './invoices.tokens';
import { InvoiceListParams, InvoiceListResponse } from '../../domain/invoices/invoice-list-params.model';

@Injectable({ providedIn: 'root' })
export class GetInvoicesUseCase {
  private readonly invoicesPort = inject(INVOICES_PORT);

  execute(params: InvoiceListParams): Observable<InvoiceListResponse> {
    return this.invoicesPort.getInvoices(params);
  }
}
