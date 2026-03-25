import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GetInvoiceUseCase } from './get-invoice.use-case';
import { INVOICES_PORT } from './invoices.tokens';
import { InvoiceDetail } from '../../domain/invoices/invoice.model';

const mockInvoiceDetail: InvoiceDetail = {
  invoiceId: 'inv-1',
  providerId: 'prov-1',
  status: 'DRAFT',
  createdAt: '2026-03-24T10:30:00.000Z',
  updatedAt: '2026-03-24T10:30:00.000Z',
  numeroFactura: 'F-001',
};

const mockPort = {
  getInvoices: vi.fn(),
  createManualInvoice: vi.fn(),
  getInvoice: vi.fn(),
  attachInvoiceFile: vi.fn(),
  updateInvoice: vi.fn(),
  deleteInvoice: vi.fn(),
  getInvoiceFile: vi.fn(),
};

describe('GetInvoiceUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        GetInvoiceUseCase,
        { provide: INVOICES_PORT, useValue: mockPort },
      ],
    });
  });

  it('should delegate to port.getInvoice with invoiceId', () => {
    mockPort.getInvoice.mockReturnValue(of(mockInvoiceDetail));
    const useCase = TestBed.inject(GetInvoiceUseCase);

    let result: InvoiceDetail | undefined;
    useCase.execute('inv-1').subscribe((invoice) => (result = invoice));

    expect(mockPort.getInvoice).toHaveBeenCalledWith('inv-1');
    expect(result).toEqual(mockInvoiceDetail);
  });
});
