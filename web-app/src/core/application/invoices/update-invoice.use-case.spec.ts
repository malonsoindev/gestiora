import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UpdateInvoiceUseCase } from './update-invoice.use-case';
import { INVOICES_PORT } from './invoices.tokens';
import { InvoiceDetail, InvoiceUpdateRequest } from '../../domain/invoices/invoice.model';

const mockDetail: InvoiceDetail = {
  invoiceId: 'inv-1',
  providerId: 'prov-1',
  status: 'DRAFT',
  createdAt: '2026-03-24T10:30:00.000Z',
  updatedAt: '2026-03-24T11:00:00.000Z',
};

const mockPort = {
  getInvoices: vi.fn(),
  createManualInvoice: vi.fn(),
  getInvoice: vi.fn(),
  updateInvoice: vi.fn(),
  deleteInvoice: vi.fn(),
  getInvoiceFile: vi.fn(),
};

describe('UpdateInvoiceUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        UpdateInvoiceUseCase,
        { provide: INVOICES_PORT, useValue: mockPort },
      ],
    });
  });

  it('should delegate to port.updateInvoice', () => {
    const request: InvoiceUpdateRequest = { numeroFactura: 'F-002' };
    mockPort.updateInvoice.mockReturnValue(of(mockDetail));
    const useCase = TestBed.inject(UpdateInvoiceUseCase);

    let result: InvoiceDetail | undefined;
    useCase.execute('inv-1', request).subscribe((invoice) => (result = invoice));

    expect(mockPort.updateInvoice).toHaveBeenCalledWith('inv-1', request);
    expect(result).toEqual(mockDetail);
  });
});
