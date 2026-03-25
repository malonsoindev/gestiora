import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { INVOICES_PORT } from './invoices.tokens';
import { InvoiceDetail, InvoiceUpdateRequest } from '../../domain/invoices/invoice.model';

@Injectable({ providedIn: 'root' })
export class UpdateInvoiceUseCase {
  private readonly invoicesPort = inject(INVOICES_PORT);

  execute(invoiceId: string, request: InvoiceUpdateRequest): Observable<InvoiceDetail> {
    return this.invoicesPort.updateInvoice(invoiceId, request);
  }
}
