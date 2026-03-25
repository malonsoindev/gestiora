import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GetInvoiceFileUseCase } from './get-invoice-file.use-case';
import { INVOICES_PORT } from './invoices.tokens';

const mockBlob = new Blob(['test-pdf'], { type: 'application/pdf' });

const mockPort = {
  getInvoices: vi.fn(),
  createManualInvoice: vi.fn(),
  getInvoice: vi.fn(),
  updateInvoice: vi.fn(),
  deleteInvoice: vi.fn(),
  getInvoiceFile: vi.fn(),
};

describe('GetInvoiceFileUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        GetInvoiceFileUseCase,
        { provide: INVOICES_PORT, useValue: mockPort },
      ],
    });
  });

  it('should delegate to port.getInvoiceFile with invoiceId', () => {
    mockPort.getInvoiceFile.mockReturnValue(of(mockBlob));
    const useCase = TestBed.inject(GetInvoiceFileUseCase);

    let result: Blob | undefined;
    useCase.execute('inv-1').subscribe((blob) => (result = blob));

    expect(mockPort.getInvoiceFile).toHaveBeenCalledWith('inv-1');
    expect(result).toBe(mockBlob);
  });
});
