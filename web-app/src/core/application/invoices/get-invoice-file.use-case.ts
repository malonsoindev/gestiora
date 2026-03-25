import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { INVOICES_PORT } from './invoices.tokens';

@Injectable({ providedIn: 'root' })
export class GetInvoiceFileUseCase {
  private readonly invoicesPort = inject(INVOICES_PORT);

  execute(invoiceId: string): Observable<Blob> {
    return this.invoicesPort.getInvoiceFile(invoiceId);
  }
}
