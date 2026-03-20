import { TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import {
  ProviderFormDialogComponent,
  ProviderFormDialogData,
} from './provider-form-dialog.component';
import { CreateProviderUseCase } from '../../../../core/application/providers/create-provider.use-case';
import { UpdateProviderUseCase } from '../../../../core/application/providers/update-provider.use-case';

const mockDialogRef = { close: vi.fn() };

const mockCreateUseCase = { execute: vi.fn() };
const mockUpdateUseCase = { execute: vi.fn() };

function createTestBed(data: ProviderFormDialogData): void {
  TestBed.configureTestingModule({
    imports: [ProviderFormDialogComponent],
    providers: [
      // provideAnimations is deprecated since Angular 20.2 but required by Material CDK
      provideAnimations(),
      { provide: MatDialogRef, useValue: mockDialogRef },
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: CreateProviderUseCase, useValue: mockCreateUseCase },
      { provide: UpdateProviderUseCase, useValue: mockUpdateUseCase },
    ],
  });
}

describe('ProviderFormDialogComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create mode (no existing provider)', () => {
    beforeEach(async () => {
      createTestBed({ provider: null });
      await TestBed.compileComponents();
    });

    it('should create in create mode', () => {
      const fixture = TestBed.createComponent(ProviderFormDialogComponent);
      expect(fixture.componentInstance).toBeTruthy();
      expect(fixture.componentInstance.isEditMode).toBe(false);
    });

    it('should have an invalid form when razonSocial is empty', () => {
      const fixture = TestBed.createComponent(ProviderFormDialogComponent);
      expect(fixture.componentInstance.form.invalid).toBe(true);
    });

    it('should have a valid form when razonSocial is filled', () => {
      const fixture = TestBed.createComponent(ProviderFormDialogComponent);
      fixture.componentInstance.form.patchValue({ razonSocial: 'Empresa Test' });
      expect(fixture.componentInstance.form.valid).toBe(true);
    });

    it('should call createProvider use case on submit with valid form', () => {
      mockCreateUseCase.execute.mockReturnValue(of({ providerId: 'new-id' }));
      const fixture = TestBed.createComponent(ProviderFormDialogComponent);
      fixture.componentInstance.form.patchValue({ razonSocial: 'Empresa Test' });
      fixture.componentInstance.onSubmit();
      expect(mockCreateUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ razonSocial: 'Empresa Test' }),
      );
    });

    it('should close dialog with true after successful create', () => {
      mockCreateUseCase.execute.mockReturnValue(of({ providerId: 'new-id' }));
      const fixture = TestBed.createComponent(ProviderFormDialogComponent);
      fixture.componentInstance.form.patchValue({ razonSocial: 'Empresa Test' });
      fixture.componentInstance.onSubmit();
      expect(mockDialogRef.close).toHaveBeenCalledWith(true);
    });

    it('should not submit when form is invalid', () => {
      const fixture = TestBed.createComponent(ProviderFormDialogComponent);
      fixture.componentInstance.onSubmit();
      expect(mockCreateUseCase.execute).not.toHaveBeenCalled();
      expect(mockUpdateUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('edit mode (existing provider)', () => {
    const existingProvider = {
      providerId: 'p-1',
      razonSocial: 'Proveedor Existente',
      cif: 'B12345678',
      status: 'ACTIVE' as const,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    };

    beforeEach(async () => {
      createTestBed({ provider: existingProvider });
      await TestBed.compileComponents();
    });

    it('should create in edit mode', () => {
      const fixture = TestBed.createComponent(ProviderFormDialogComponent);
      expect(fixture.componentInstance.isEditMode).toBe(true);
    });

    it('should pre-fill the form with the existing provider data', () => {
      const fixture = TestBed.createComponent(ProviderFormDialogComponent);
      expect(fixture.componentInstance.form.value.razonSocial).toBe('Proveedor Existente');
      expect(fixture.componentInstance.form.value.cif).toBe('B12345678');
    });

    it('should call updateProvider use case on submit', () => {
      mockUpdateUseCase.execute.mockReturnValue(of(existingProvider));
      const fixture = TestBed.createComponent(ProviderFormDialogComponent);
      fixture.componentInstance.onSubmit();
      expect(mockUpdateUseCase.execute).toHaveBeenCalledWith(
        'p-1',
        expect.objectContaining({ razonSocial: 'Proveedor Existente' }),
      );
    });

    it('should close dialog with true after successful update', () => {
      mockUpdateUseCase.execute.mockReturnValue(of(existingProvider));
      const fixture = TestBed.createComponent(ProviderFormDialogComponent);
      fixture.componentInstance.onSubmit();
      expect(mockDialogRef.close).toHaveBeenCalledWith(true);
    });
  });

  describe('onCancel', () => {
    beforeEach(async () => {
      createTestBed({ provider: null });
      await TestBed.compileComponents();
    });

    it('should close the dialog with false', () => {
      const fixture = TestBed.createComponent(ProviderFormDialogComponent);
      fixture.componentInstance.onCancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith(false);
    });
  });
});
