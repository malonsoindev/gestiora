import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { INVOICES_PORT } from './invoices.tokens';

@Injectable({ providedIn: 'root' })
export class DeleteInvoiceUseCase {
  private readonly invoicesPort = inject(INVOICES_PORT);

  execute(invoiceId: string): Observable<void> {
    return this.invoicesPort.deleteInvoice(invoiceId);
  }
}
