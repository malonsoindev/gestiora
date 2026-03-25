import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InvoiceDetailComponent } from './invoice-detail.component';
import { AttachInvoiceFileUseCase } from '../../../../core/application/invoices/attach-invoice-file.use-case';
import { CreateManualInvoiceUseCase } from '../../../../core/application/invoices/create-manual-invoice.use-case';
import { GetInvoiceFileUseCase } from '../../../../core/application/invoices/get-invoice-file.use-case';
import { GetInvoiceUseCase } from '../../../../core/application/invoices/get-invoice.use-case';
import { UpdateInvoiceUseCase } from '../../../../core/application/invoices/update-invoice.use-case';

const mockGetInvoice = {
  execute: vi.fn(),
};

const mockUpdateInvoice = {
  execute: vi.fn(),
};

const mockCreateManualInvoice = {
  execute: vi.fn(),
};

const mockAttachInvoiceFile = {
  execute: vi.fn(),
};

const mockGetInvoiceFile = {
  execute: vi.fn(),
};

const mockSnackBar = {
  open: vi.fn(),
};

describe('InvoiceDetailComponent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    mockCreateManualInvoice.execute.mockReturnValue(of({ invoiceId: 'inv-2' }));
    mockGetInvoiceFile.execute.mockReturnValue(of(new Blob(['pdf-content'], { type: 'application/pdf' })));
    mockAttachInvoiceFile.execute.mockReturnValue(
      of({
        invoiceId: 'inv-1',
        providerId: 'prov-1',
        status: 'DRAFT',
        createdAt: '2026-03-24T10:30:00.000Z',
        updatedAt: '2026-03-24T12:00:00.000Z',
        fileRef: {
          storageKey: 'documents/inv-1.pdf',
          filename: 'factura.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 2048,
          checksum: 'abc123',
        },
      }),
    );
    mockSnackBar.open.mockReset();

    await TestBed.configureTestingModule({
      imports: [InvoiceDetailComponent],
      providers: [
        provideAnimations(),
        provideRouter([]),
        { provide: AttachInvoiceFileUseCase, useValue: mockAttachInvoiceFile },
        { provide: CreateManualInvoiceUseCase, useValue: mockCreateManualInvoice },
        { provide: GetInvoiceFileUseCase, useValue: mockGetInvoiceFile },
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

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
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
    expect(mockCreateManualInvoice.execute).not.toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Factura guardada correctamente.',
      'Cerrar',
      expect.objectContaining({ duration: 3000 }),
    );
  });

  it('should create invoice when route has no invoiceId', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: {
          paramMap: {
            get: () => null,
          },
        },
      },
    });

    const fixture = TestBed.createComponent(InvoiceDetailComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.controls.providerId.setValue('prov-1');
    fixture.componentInstance.form.controls.numeroFactura.setValue('F-100');
    fixture.componentInstance.form.controls.fechaOperacion.setValue('2026-03-25');
    fixture.componentInstance.form.controls.total.setValue(100);

    const movement = fixture.componentInstance.movementsArray.at(0);
    movement?.get('concepto')?.setValue('Servicio');
    movement?.get('cantidad')?.setValue(1);
    movement?.get('precio')?.setValue(100);
    movement?.get('total')?.setValue(100);

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.saveInvoice();

    expect(mockCreateManualInvoice.execute).toHaveBeenCalled();
    expect(mockUpdateInvoice.execute).not.toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Factura creada correctamente.',
      'Cerrar',
      expect.objectContaining({ duration: 3000 }),
    );
    expect(navigateSpy).toHaveBeenCalledWith(['/invoices', 'inv-2']);
  });

  it('should keep at least one movement row', () => {
    const fixture = TestBed.createComponent(InvoiceDetailComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.movementsArray.length).toBe(1);

    fixture.componentInstance.removeMovement(0);

    expect(fixture.componentInstance.movementsArray.length).toBe(1);
  });

  it('should not save when date format is invalid', () => {
    const fixture = TestBed.createComponent(InvoiceDetailComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.controls.numeroFactura.setValue('F-009');
    fixture.componentInstance.form.controls.fechaOperacion.setValue('24-03-2026');
    fixture.componentInstance.form.controls.total.setValue(100);

    const movement = fixture.componentInstance.movementsArray.at(0);
    movement?.get('concepto')?.setValue('Servicio');
    movement?.get('cantidad')?.setValue(1);
    movement?.get('precio')?.setValue(100);
    movement?.get('total')?.setValue(100);

    fixture.componentInstance.saveInvoice();

    expect(mockUpdateInvoice.execute).not.toHaveBeenCalled();
    expect(mockCreateManualInvoice.execute).not.toHaveBeenCalled();
  });

  it('should attach pdf file for existing invoice', () => {
    const fixture = TestBed.createComponent(InvoiceDetailComponent);
    fixture.detectChanges();

    const file = new File(['pdf'], 'factura.pdf', { type: 'application/pdf' });
    fixture.componentInstance.attachSourceFile(file);

    expect(mockAttachInvoiceFile.execute).toHaveBeenCalledWith('inv-1', file);
    expect(mockGetInvoiceFile.execute).toHaveBeenCalledWith('inv-1');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Documento adjuntado correctamente.',
      'Cerrar',
      expect.objectContaining({ duration: 3000 }),
    );
  });

  it('should download attached pdf from viewer action', () => {
    const fixture = TestBed.createComponent(InvoiceDetailComponent);
    fixture.detectChanges();

    fixture.componentInstance.attachedFile.set({
      storageKey: 'documents/inv-1.pdf',
      filename: 'factura.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      checksum: 'abc123',
    });

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    fixture.componentInstance.downloadAttachedFile();

    expect(mockGetInvoiceFile.execute).toHaveBeenCalledWith('inv-1');
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('should not attach file in create mode', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: {
          paramMap: {
            get: () => null,
          },
        },
      },
    });

    const fixture = TestBed.createComponent(InvoiceDetailComponent);
    fixture.detectChanges();

    const file = new File(['pdf'], 'factura.pdf', { type: 'application/pdf' });
    fixture.componentInstance.attachSourceFile(file);

    expect(mockAttachInvoiceFile.execute).not.toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Guarda la factura antes de adjuntar el PDF.',
      'Cerrar',
      expect.objectContaining({ duration: 3500 }),
    );
  });

  it('should toggle replace mode for attached file', () => {
    const fixture = TestBed.createComponent(InvoiceDetailComponent);
    fixture.detectChanges();

    fixture.componentInstance.attachedFile.set({
      storageKey: 'documents/inv-1.pdf',
      filename: 'factura.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      checksum: 'abc123',
    });

    fixture.componentInstance.beginReplaceAttachedFile();
    expect(fixture.componentInstance.isReplacingAttachedFile()).toBe(true);

    fixture.componentInstance.cancelReplaceAttachedFile();
    expect(fixture.componentInstance.isReplacingAttachedFile()).toBe(false);
  });

});
