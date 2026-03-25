import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { InvoicesAdapter } from './invoices.adapter';
import {
  InvoiceListParams,
  InvoiceListResponse,
} from '../../core/domain/invoices/invoice-list-params.model';

const BASE = '/api/documents';

const mockSummary = {
  invoiceId: 'inv-1',
  providerId: 'prov-1',
  status: 'DRAFT' as const,
  createdAt: '2026-03-24T10:30:00.000Z',
};

describe('InvoicesAdapter', () => {
  let adapter: InvoicesAdapter;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InvoicesAdapter,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    adapter = TestBed.inject(InvoicesAdapter);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
  });

  describe('getInvoices', () => {
    it('should GET /api/documents with no query params when params are empty', () => {
      const params: InvoiceListParams = {};
      const mockResponse: InvoiceListResponse = { items: [mockSummary], total: 1 };

      adapter.getInvoices(params).subscribe();

      const req = controller.expectOne(BASE);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should GET /api/documents with page and pageSize query params', () => {
      const params: InvoiceListParams = { page: 2, pageSize: 20 };
      const mockResponse: InvoiceListResponse = { items: [], total: 0 };

      adapter.getInvoices(params).subscribe();

      const req = controller.expectOne(`${BASE}?page=2&pageSize=20`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should GET /api/documents with filter query params', () => {
      const params: InvoiceListParams = {
        providerId: 'prov-1',
        fromDate: '2026-03-01',
        toDate: '2026-03-31',
        minTotal: 100,
        maxTotal: 500,
      };
      const mockResponse: InvoiceListResponse = { items: [], total: 0 };

      adapter.getInvoices(params).subscribe();

      const req = controller.expectOne(
        `${BASE}?providerId=prov-1&fromDate=2026-03-01&toDate=2026-03-31&minTotal=100&maxTotal=500`,
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should return the InvoiceListResponse from the server', () => {
      const mockResponse: InvoiceListResponse = {
        items: [mockSummary],
        total: 1,
        page: 1,
        pageSize: 10,
      };
      let result: InvoiceListResponse | undefined;

      adapter.getInvoices({}).subscribe((r) => (result = r));

      controller.expectOne(BASE).flush(mockResponse);
      expect(result).toEqual(mockResponse);
    });
  });
});
