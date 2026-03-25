import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GetInvoicesUseCase } from './get-invoices.use-case';
import { INVOICES_PORT } from './invoices.tokens';
import { InvoiceListResponse } from '../../domain/invoices/invoice-list-params.model';

const mockResponse: InvoiceListResponse = {
  items: [
    {
      invoiceId: 'inv-1',
      providerId: 'prov-1',
      status: 'DRAFT',
      createdAt: '2026-03-24T10:30:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 10,
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

describe('GetInvoicesUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        GetInvoicesUseCase,
        { provide: INVOICES_PORT, useValue: mockPort },
      ],
    });
  });

  it('should delegate to port.getInvoices with the provided params', () => {
    mockPort.getInvoices.mockReturnValue(of(mockResponse));
    const useCase = TestBed.inject(GetInvoicesUseCase);

    let result: InvoiceListResponse | undefined;
    useCase.execute({ page: 1, pageSize: 10 }).subscribe((r) => (result = r));

    expect(mockPort.getInvoices).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
    expect(result).toEqual(mockResponse);
  });

  it('should pass empty params to port.getInvoices', () => {
    mockPort.getInvoices.mockReturnValue(of(mockResponse));
    const useCase = TestBed.inject(GetInvoicesUseCase);

    useCase.execute({}).subscribe();

    expect(mockPort.getInvoices).toHaveBeenCalledWith({});
  });
});
