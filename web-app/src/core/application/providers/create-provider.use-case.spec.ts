import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CreateProviderUseCase } from './create-provider.use-case';
import { PROVIDERS_PORT } from './providers.tokens';
import { CreateProviderRequest } from '../../domain/providers/provider.model';

const mockPort = {
  getProviders: vi.fn(),
  getProvider: vi.fn(),
  createProvider: vi.fn(),
  updateProvider: vi.fn(),
  deleteProvider: vi.fn(),
  updateProviderStatus: vi.fn(),
};

describe('CreateProviderUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        CreateProviderUseCase,
        { provide: PROVIDERS_PORT, useValue: mockPort },
      ],
    });
  });

  it('should delegate to port.createProvider with the provided request', () => {
    const request: CreateProviderRequest = {
      razonSocial: 'Nueva Empresa S.L.',
      cif: 'B12345678',
    };
    mockPort.createProvider.mockReturnValue(of({ providerId: 'new-id' }));
    const useCase = TestBed.inject(CreateProviderUseCase);

    let result: { providerId: string } | undefined;
    useCase.execute(request).subscribe((r) => (result = r));

    expect(mockPort.createProvider).toHaveBeenCalledWith(request);
    expect(result).toEqual({ providerId: 'new-id' });
  });
});
