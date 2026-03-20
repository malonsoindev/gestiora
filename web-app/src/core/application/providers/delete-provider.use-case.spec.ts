import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DeleteProviderUseCase } from './delete-provider.use-case';
import { PROVIDERS_PORT } from './providers.tokens';

const mockPort = {
  getProviders: vi.fn(),
  getProvider: vi.fn(),
  createProvider: vi.fn(),
  updateProvider: vi.fn(),
  deleteProvider: vi.fn(),
  updateProviderStatus: vi.fn(),
};

describe('DeleteProviderUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        DeleteProviderUseCase,
        { provide: PROVIDERS_PORT, useValue: mockPort },
      ],
    });
  });

  it('should delegate to port.deleteProvider with the provided id', () => {
    mockPort.deleteProvider.mockReturnValue(of(undefined));
    const useCase = TestBed.inject(DeleteProviderUseCase);

    let completed = false;
    useCase.execute('abc-123').subscribe({ complete: () => (completed = true) });

    expect(mockPort.deleteProvider).toHaveBeenCalledWith('abc-123');
    expect(completed).toBe(true);
  });
});
