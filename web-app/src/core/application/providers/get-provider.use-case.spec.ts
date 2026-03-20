import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GetProviderUseCase } from './get-provider.use-case';
import { PROVIDERS_PORT } from './providers.tokens';
import { ProviderDetail } from '../../domain/providers/provider.model';

const mockDetail: ProviderDetail = {
  providerId: 'abc-123',
  razonSocial: 'Proveedor Test',
  status: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
};

const mockPort = {
  getProviders: vi.fn(),
  getProvider: vi.fn(),
  createProvider: vi.fn(),
  updateProvider: vi.fn(),
  deleteProvider: vi.fn(),
  updateProviderStatus: vi.fn(),
};

describe('GetProviderUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        GetProviderUseCase,
        { provide: PROVIDERS_PORT, useValue: mockPort },
      ],
    });
  });

  it('should delegate to port.getProvider with the provided id', () => {
    mockPort.getProvider.mockReturnValue(of(mockDetail));
    const useCase = TestBed.inject(GetProviderUseCase);

    let result: ProviderDetail | undefined;
    useCase.execute('abc-123').subscribe((r) => (result = r));

    expect(mockPort.getProvider).toHaveBeenCalledWith('abc-123');
    expect(result).toEqual(mockDetail);
  });
});
