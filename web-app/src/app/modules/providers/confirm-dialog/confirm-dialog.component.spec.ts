import { TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

const mockDialogRef = {
  close: vi.fn(),
};

const mockData: ConfirmDialogData = {
  title: 'Eliminar proveedor',
  message: '¿Estás seguro de que deseas eliminar este proveedor?',
  confirmLabel: 'Eliminar',
  cancelLabel: 'Cancelar',
};

describe('ConfirmDialogComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        // provideAnimations is deprecated since Angular 20.2 but required by Material CDK
        provideAnimations(),
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should expose title and message from injected data', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    expect(fixture.componentInstance.data.title).toBe('Eliminar proveedor');
    expect(fixture.componentInstance.data.message).toBe(
      '¿Estás seguro de que deseas eliminar este proveedor?',
    );
  });

  it('should close the dialog with false when onCancel is called', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.componentInstance.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should close the dialog with true when onConfirm is called', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.componentInstance.onConfirm();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });
});
