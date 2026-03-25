import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CreateManualInvoiceUseCase } from './create-manual-invoice.use-case';
import { INVOICES_PORT } from './invoices.tokens';
import { CreateManualInvoiceRequest } from '../../domain/invoices/invoice.model';

const mockPort = {
  getInvoices: vi.fn(),
  createManualInvoice: vi.fn(),
  getInvoice: vi.fn(),
  updateInvoice: vi.fn(),
  deleteInvoice: vi.fn(),
  getInvoiceFile: vi.fn(),
};

describe('CreateManualInvoiceUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        CreateManualInvoiceUseCase,
        { provide: INVOICES_PORT, useValue: mockPort },
      ],
    });
  });

  it('should delegate create request to port', () => {
    const request: CreateManualInvoiceRequest = {
      providerId: 'prov-1',
      invoice: {
        numeroFactura: 'F-001',
        movements: [
          {
            concepto: 'Servicio',
            cantidad: 1,
            precio: 100,
            total: 100,
          },
        ],
      },
    };
    mockPort.createManualInvoice.mockReturnValue(of({ invoiceId: 'inv-10' }));
    const useCase = TestBed.inject(CreateManualInvoiceUseCase);

    let result: { invoiceId: string } | undefined;
    useCase.execute(request).subscribe((response) => (result = response));

    expect(mockPort.createManualInvoice).toHaveBeenCalledWith(request);
    expect(result).toEqual({ invoiceId: 'inv-10' });
  });
});
