import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { INVOICES_PORT } from './invoices.tokens';
import {
  CreateManualInvoiceRequest,
  CreateManualInvoiceResponse,
} from '../../domain/invoices/invoice.model';

@Injectable({ providedIn: 'root' })
export class CreateManualInvoiceUseCase {
  private readonly invoicesPort = inject(INVOICES_PORT);

  execute(request: CreateManualInvoiceRequest): Observable<CreateManualInvoiceResponse> {
    return this.invoicesPort.createManualInvoice(request);
  }
}
