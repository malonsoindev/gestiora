import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InvoiceDetailComponent } from './invoice-detail.component';
import { GetInvoiceUseCase } from '../../../../core/application/invoices/get-invoice.use-case';
import { UpdateInvoiceUseCase } from '../../../../core/application/invoices/update-invoice.use-case';

const mockGetInvoice = {
  execute: vi.fn(),
};

const mockUpdateInvoice = {
  execute: vi.fn(),
};

const mockSnackBar = {
  open: vi.fn(),
};

describe('InvoiceDetailComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetInvoice.execute.mockReturnValue(
      of({
        invoiceId: 'inv-1',
        providerId: 'prov-1',
        status: 'DRAFT',
        createdAt: '2026-03-24T10:30:00.000Z',
        updatedAt: '2026-03-24T11:00:00.000Z',
        numeroFactura: 'F-001',
        total: 100,
        movements: [
          {
            id: 'm-1',
            concepto: 'Servicio',
            cantidad: 1,
            precio: 100,
            total: 100,
          },
        ],
      }),
    );
    mockUpdateInvoice.execute.mockReturnValue(
      of({
        invoiceId: 'inv-1',
        providerId: 'prov-1',
        status: 'DRAFT',
        createdAt: '2026-03-24T10:30:00.000Z',
        updatedAt: '2026-03-24T12:00:00.000Z',
        numeroFactura: 'F-001',
        total: 100,
        movements: [
          {
            id: 'm-1',
            concepto: 'Servicio',
            cantidad: 1,
            precio: 100,
            total: 100,
          },
        ],
      }),
    );
    mockSnackBar.open.mockReset();

    await TestBed.configureTestingModule({
      imports: [InvoiceDetailComponent],
      providers: [
        provideAnimations(),
        provideRouter([]),
        { provide: GetInvoiceUseCase, useValue: mockGetInvoice },
        { provide: UpdateInvoiceUseCase, useValue: mockUpdateInvoice },
        { provide: MatSnackBar, useValue: mockSnackBar },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'invoiceId' ? 'inv-1' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(InvoiceDetailComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load invoice details on init and render header', () => {
    const fixture = TestBed.createComponent(InvoiceDetailComponent);
    fixture.detectChanges();

    expect(mockGetInvoice.execute).toHaveBeenCalledWith('inv-1');
    expect(fixture.componentInstance.form.get('numeroFactura')?.value).toBe('F-001');
    expect(fixture.componentInstance.movementsArray.at(0)?.get('concepto')?.value).toBe('Servicio');

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Factura inv-1');
  });

  it('should save invoice when form is valid', () => {
    const fixture = TestBed.createComponent(InvoiceDetailComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.controls.numeroFactura.setValue('F-009');
    fixture.componentInstance.form.controls.fechaOperacion.setValue('2026-03-24');
    fixture.componentInstance.form.controls.total.setValue(100);

    const movement = fixture.componentInstance.movementsArray.at(0);
    movement?.get('concepto')?.setValue('Servicio');
    movement?.get('cantidad')?.setValue(1);
    movement?.get('precio')?.setValue(100);
    movement?.get('total')?.setValue(100);

    fixture.componentInstance.saveInvoice();

    expect(mockUpdateInvoice.execute).toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Factura guardada correctamente.',
      'Cerrar',
      expect.objectContaining({ duration: 3000 }),
    );
  });
});
