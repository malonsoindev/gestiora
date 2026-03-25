import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { INVOICES_PORT } from './invoices.tokens';
import { InvoiceDetail } from '../../domain/invoices/invoice.model';

@Injectable({ providedIn: 'root' })
export class GetInvoiceUseCase {
  private readonly invoicesPort = inject(INVOICES_PORT);

  execute(invoiceId: string): Observable<InvoiceDetail> {
    return this.invoicesPort.getInvoice(invoiceId);
  }
}
