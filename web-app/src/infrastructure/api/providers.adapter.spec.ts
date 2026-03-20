import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProvidersAdapter } from './providers.adapter';
import {
  CreateProviderRequest,
  ProviderDetail,
  UpdateProviderRequest,
  UpdateProviderStatusRequest,
} from '../../core/domain/providers/provider.model';
import {
  ProviderListParams,
  ProviderListResponse,
} from '../../core/domain/providers/provider-list-params.model';

const BASE = '/api/providers';

const mockSummary = {
  providerId: 'p-1',
  razonSocial: 'Proveedor Uno',
  status: 'ACTIVE' as const,
};

const mockDetail: ProviderDetail = {
  ...mockSummary,
  cif: 'B12345678',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
};

describe('ProvidersAdapter', () => {
  let adapter: ProvidersAdapter;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProvidersAdapter,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    adapter = TestBed.inject(ProvidersAdapter);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
  });

  // ---------------------------------------------------------------------------
  // getProviders
  // ---------------------------------------------------------------------------
  describe('getProviders', () => {
    it('should GET /api/providers with no query params when params are empty', () => {
      const params: ProviderListParams = {};
      const mockResponse: ProviderListResponse = { items: [mockSummary], total: 1 };

      adapter.getProviders(params).subscribe();

      const req = controller.expectOne(BASE);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should GET /api/providers with page and pageSize query params', () => {
      const params: ProviderListParams = { page: 2, pageSize: 20 };
      const mockResponse: ProviderListResponse = { items: [], total: 0 };

      adapter.getProviders(params).subscribe();

      const req = controller.expectOne(`${BASE}?page=2&pageSize=20`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should GET /api/providers with q and status query params', () => {
      const params: ProviderListParams = { q: 'test', status: 'INACTIVE' };
      const mockResponse: ProviderListResponse = { items: [], total: 0 };

      adapter.getProviders(params).subscribe();

      const req = controller.expectOne(`${BASE}?q=test&status=INACTIVE`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should return the ProviderListResponse from the server', () => {
      const mockResponse: ProviderListResponse = { items: [mockSummary], total: 1, page: 1, pageSize: 10 };
      let result: ProviderListResponse | undefined;

      adapter.getProviders({}).subscribe((r) => (result = r));

      controller.expectOne(BASE).flush(mockResponse);
      expect(result).toEqual(mockResponse);
    });
  });

  // ---------------------------------------------------------------------------
  // getProvider
  // ---------------------------------------------------------------------------
  describe('getProvider', () => {
    it('should GET /api/providers/:id', () => {
      adapter.getProvider('p-1').subscribe();

      const req = controller.expectOne(`${BASE}/p-1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockDetail);
    });

    it('should return the ProviderDetail from the server', () => {
      let result: ProviderDetail | undefined;
      adapter.getProvider('p-1').subscribe((r) => (result = r));

      controller.expectOne(`${BASE}/p-1`).flush(mockDetail);
      expect(result).toEqual(mockDetail);
    });
  });

  // ---------------------------------------------------------------------------
  // createProvider
  // ---------------------------------------------------------------------------
  describe('createProvider', () => {
    it('should POST /api/providers with the request body', () => {
      const request: CreateProviderRequest = { razonSocial: 'Nueva Empresa', cif: 'B99999999' };

      adapter.createProvider(request).subscribe();

      const req = controller.expectOne(BASE);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush({ providerId: 'new-p-1' });
    });

    it('should return the created providerId', () => {
      let result: { providerId: string } | undefined;
      adapter
        .createProvider({ razonSocial: 'Test' })
        .subscribe((r) => (result = r));

      controller.expectOne(BASE).flush({ providerId: 'new-p-1' });
      expect(result).toEqual({ providerId: 'new-p-1' });
    });
  });

  // ---------------------------------------------------------------------------
  // updateProvider
  // ---------------------------------------------------------------------------
  describe('updateProvider', () => {
    it('should PUT /api/providers/:id with the request body', () => {
      const request: UpdateProviderRequest = { razonSocial: 'Empresa Actualizada' };

      adapter.updateProvider('p-1', request).subscribe();

      const req = controller.expectOne(`${BASE}/p-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(request);
      req.flush(mockDetail);
    });

    it('should return the updated ProviderDetail', () => {
      let result: ProviderDetail | undefined;
      adapter
        .updateProvider('p-1', { razonSocial: 'Actualizado' })
        .subscribe((r) => (result = r));

      controller.expectOne(`${BASE}/p-1`).flush(mockDetail);
      expect(result).toEqual(mockDetail);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteProvider
  // ---------------------------------------------------------------------------
  describe('deleteProvider', () => {
    it('should DELETE /api/providers/:id', () => {
      adapter.deleteProvider('p-1').subscribe();

      const req = controller.expectOne(`${BASE}/p-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('should complete without emitting when the server returns 204', () => {
      let completed = false;
      adapter.deleteProvider('p-1').subscribe({ complete: () => (completed = true) });

      controller
        .expectOne(`${BASE}/p-1`)
        .flush(null, { status: 204, statusText: 'No Content' });
      expect(completed).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // updateProviderStatus
  // ---------------------------------------------------------------------------
  describe('updateProviderStatus', () => {
    it('should PATCH /api/providers/:id/status with the request body', () => {
      const request: UpdateProviderStatusRequest = { status: 'INACTIVE' };

      adapter.updateProviderStatus('p-1', request).subscribe();

      const req = controller.expectOne(`${BASE}/p-1/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(request);
      req.flush({ ...mockDetail, status: 'INACTIVE' });
    });

    it('should return the updated ProviderDetail with the new status', () => {
      let result: ProviderDetail | undefined;
      adapter
        .updateProviderStatus('p-1', { status: 'INACTIVE' })
        .subscribe((r) => (result = r));

      const updatedDetail = { ...mockDetail, status: 'INACTIVE' as const };
      controller.expectOne(`${BASE}/p-1/status`).flush(updatedDetail);
      expect(result?.status).toBe('INACTIVE');
    });
  });
});
