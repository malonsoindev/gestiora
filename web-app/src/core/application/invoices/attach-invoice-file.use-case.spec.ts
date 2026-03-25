import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AttachInvoiceFileUseCase } from './attach-invoice-file.use-case';
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

describe('AttachInvoiceFileUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        AttachInvoiceFileUseCase,
        { provide: INVOICES_PORT, useValue: mockPort },
      ],
    });
  });

  it('should delegate file attachment to port', () => {
    const file = new File(['pdf'], 'invoice.pdf', { type: 'application/pdf' });
    mockPort.attachInvoiceFile.mockReturnValue(
      of({
        invoiceId: 'inv-1',
        providerId: 'prov-1',
        status: 'DRAFT',
        createdAt: '2026-03-24T10:00:00.000Z',
        updatedAt: '2026-03-24T10:00:00.000Z',
      }),
    );

    const useCase = TestBed.inject(AttachInvoiceFileUseCase);
    useCase.execute('inv-1', file).subscribe();

    expect(mockPort.attachInvoiceFile).toHaveBeenCalledWith('inv-1', file);
  });
});
