import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UpdateProviderStatusUseCase } from './update-provider-status.use-case';
import { PROVIDERS_PORT } from './providers.tokens';
import { ProviderDetail, UpdateProviderStatusRequest } from '../../domain/providers/provider.model';

const mockPort = {
  getProviders: vi.fn(),
  getProvider: vi.fn(),
  createProvider: vi.fn(),
  updateProvider: vi.fn(),
  deleteProvider: vi.fn(),
  updateProviderStatus: vi.fn(),
};

describe('UpdateProviderStatusUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        UpdateProviderStatusUseCase,
        { provide: PROVIDERS_PORT, useValue: mockPort },
      ],
    });
  });

  it('should delegate to port.updateProviderStatus with id and request', () => {
    const request: UpdateProviderStatusRequest = { status: 'INACTIVE' };
    const updatedDetail: ProviderDetail = {
      providerId: 'abc-123',
      razonSocial: 'Empresa Test S.L.',
      status: 'INACTIVE',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-06-01T00:00:00Z',
    };
    mockPort.updateProviderStatus.mockReturnValue(of(updatedDetail));
    const useCase = TestBed.inject(UpdateProviderStatusUseCase);

    let result: ProviderDetail | undefined;
    useCase.execute('abc-123', request).subscribe((r) => (result = r));

    expect(mockPort.updateProviderStatus).toHaveBeenCalledWith('abc-123', request);
    expect(result).toEqual(updatedDetail);
  });
});
