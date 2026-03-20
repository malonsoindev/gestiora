import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GetProvidersUseCase } from './get-providers.use-case';
import { PROVIDERS_PORT } from './providers.tokens';
import { ProviderListResponse } from '../../domain/providers/provider-list-params.model';

const mockResponse: ProviderListResponse = {
  items: [{ providerId: '1', razonSocial: 'Proveedor A', status: 'ACTIVE' }],
  total: 1,
  page: 1,
  pageSize: 10,
};

const mockPort = {
  getProviders: vi.fn(),
  getProvider: vi.fn(),
  createProvider: vi.fn(),
  updateProvider: vi.fn(),
  deleteProvider: vi.fn(),
  updateProviderStatus: vi.fn(),
};

describe('GetProvidersUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        GetProvidersUseCase,
        { provide: PROVIDERS_PORT, useValue: mockPort },
      ],
    });
  });

  it('should delegate to port.getProviders with the provided params', () => {
    mockPort.getProviders.mockReturnValue(of(mockResponse));
    const useCase = TestBed.inject(GetProvidersUseCase);

    let result: ProviderListResponse | undefined;
    useCase.execute({ page: 1, pageSize: 10 }).subscribe((r) => (result = r));

    expect(mockPort.getProviders).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
    expect(result).toEqual(mockResponse);
  });

  it('should pass empty params to port.getProviders', () => {
    mockPort.getProviders.mockReturnValue(of(mockResponse));
    const useCase = TestBed.inject(GetProvidersUseCase);

    useCase.execute({}).subscribe();

    expect(mockPort.getProviders).toHaveBeenCalledWith({});
  });
});
