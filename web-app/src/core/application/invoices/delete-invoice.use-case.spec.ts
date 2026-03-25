import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DeleteInvoiceUseCase } from './delete-invoice.use-case';
import { INVOICES_PORT } from './invoices.tokens';

const mockPort = {
  getInvoices: vi.fn(),
  createManualInvoice: vi.fn(),
  getInvoice: vi.fn(),
  attachInvoiceFile: vi.fn(),
  updateInvoice: vi.fn(),
  deleteInvoice: vi.fn(),
  getInvoiceFile: vi.fn(),
};

describe('DeleteInvoiceUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        DeleteInvoiceUseCase,
        { provide: INVOICES_PORT, useValue: mockPort },
      ],
    });
  });

  it('should delegate delete request to port', () => {
    mockPort.deleteInvoice.mockReturnValue(of(undefined));
    const useCase = TestBed.inject(DeleteInvoiceUseCase);

    useCase.execute('inv-1').subscribe();

    expect(mockPort.deleteInvoice).toHaveBeenCalledWith('inv-1');
  });
});
