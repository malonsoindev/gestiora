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
import { InvoiceDetail, InvoiceUpdateRequest } from '../../core/domain/invoices/invoice.model';

const BASE = '/api/documents';

const mockSummary = {
  invoiceId: 'inv-1',
  providerId: 'prov-1',
  status: 'DRAFT' as const,
  createdAt: '2026-03-24T10:30:00.000Z',
};

const mockDetail: InvoiceDetail = {
  ...mockSummary,
  updatedAt: '2026-03-24T11:00:00.000Z',
  numeroFactura: 'F-001',
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

  describe('getInvoice', () => {
    it('should GET /api/documents/:id', () => {
      adapter.getInvoice('inv-1').subscribe();

      const req = controller.expectOne(`${BASE}/inv-1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockDetail);
    });

    it('should return the InvoiceDetail from the server', () => {
      let result: InvoiceDetail | undefined;

      adapter.getInvoice('inv-1').subscribe((invoice) => (result = invoice));

      controller.expectOne(`${BASE}/inv-1`).flush(mockDetail);
      expect(result).toEqual(mockDetail);
    });
  });

  describe('updateInvoice', () => {
    it('should PUT /api/documents/:id/invoice with request body', () => {
      const request: InvoiceUpdateRequest = {
        numeroFactura: 'F-002',
        total: 121,
        movements: [
          {
            concepto: 'Servicio',
            cantidad: 1,
            precio: 100,
            iva: 21,
            total: 121,
          },
        ],
      };

      adapter.updateInvoice('inv-1', request).subscribe();

      const req = controller.expectOne(`${BASE}/inv-1/invoice`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(request);
      req.flush(mockDetail);
    });

    it('should return updated InvoiceDetail', () => {
      let result: InvoiceDetail | undefined;

      adapter.updateInvoice('inv-1', {}).subscribe((invoice) => (result = invoice));

      controller.expectOne(`${BASE}/inv-1/invoice`).flush(mockDetail);
      expect(result).toEqual(mockDetail);
    });
  });

  describe('getInvoiceFile', () => {
    it('should GET /api/documents/:id/file as blob', () => {
      const fileBlob = new Blob(['pdf-content'], { type: 'application/pdf' });

      adapter.getInvoiceFile('inv-1').subscribe();

      const req = controller.expectOne(`${BASE}/inv-1/file`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(fileBlob);
    });

    it('should return the file blob from the server', () => {
      const fileBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
      let result: Blob | undefined;

      adapter.getInvoiceFile('inv-1').subscribe((blob) => (result = blob));

      controller.expectOne(`${BASE}/inv-1/file`).flush(fileBlob);
      expect(result).toEqual(fileBlob);
    });
  });
});
