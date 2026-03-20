import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UpdateProviderUseCase } from './update-provider.use-case';
import { PROVIDERS_PORT } from './providers.tokens';
import { ProviderDetail, UpdateProviderRequest } from '../../domain/providers/provider.model';

const mockPort = {
  getProviders: vi.fn(),
  getProvider: vi.fn(),
  createProvider: vi.fn(),
  updateProvider: vi.fn(),
  deleteProvider: vi.fn(),
  updateProviderStatus: vi.fn(),
};

describe('UpdateProviderUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        UpdateProviderUseCase,
        { provide: PROVIDERS_PORT, useValue: mockPort },
      ],
    });
  });

  it('should delegate to port.updateProvider with id and request', () => {
    const request: UpdateProviderRequest = { razonSocial: 'Empresa Actualizada S.L.' };
    const updatedDetail: ProviderDetail = {
      providerId: 'abc-123',
      razonSocial: 'Empresa Actualizada S.L.',
      status: 'ACTIVE',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-06-01T00:00:00Z',
    };
    mockPort.updateProvider.mockReturnValue(of(updatedDetail));
    const useCase = TestBed.inject(UpdateProviderUseCase);

    let result: ProviderDetail | undefined;
    useCase.execute('abc-123', request).subscribe((r) => (result = r));

    expect(mockPort.updateProvider).toHaveBeenCalledWith('abc-123', request);
    expect(result).toEqual(updatedDetail);
  });
});
