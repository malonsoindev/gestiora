import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IInvoicesPort } from '../../core/domain/invoices/invoices.port';
import {
  InvoiceListParams,
  InvoiceListResponse,
} from '../../core/domain/invoices/invoice-list-params.model';

@Injectable()
export class InvoicesAdapter implements IInvoicesPort {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/documents';

  getInvoices(params: InvoiceListParams): Observable<InvoiceListResponse> {
    let httpParams = new HttpParams();

    if (params.providerId !== undefined) {
      httpParams = httpParams.set('providerId', params.providerId);
    }
    if (params.fromDate !== undefined) {
      httpParams = httpParams.set('fromDate', params.fromDate);
    }
    if (params.toDate !== undefined) {
      httpParams = httpParams.set('toDate', params.toDate);
    }
    if (params.minTotal !== undefined) {
      httpParams = httpParams.set('minTotal', params.minTotal.toString());
    }
    if (params.maxTotal !== undefined) {
      httpParams = httpParams.set('maxTotal', params.maxTotal.toString());
    }
    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.pageSize !== undefined) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }

    return this.http.get<InvoiceListResponse>(this.baseUrl, { params: httpParams });
  }
}
