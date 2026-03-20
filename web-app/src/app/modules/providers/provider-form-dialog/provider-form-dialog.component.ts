import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { of, switchMap } from 'rxjs';
import { CreateProviderUseCase } from '../../../../core/application/providers/create-provider.use-case';
import { UpdateProviderStatusUseCase } from '../../../../core/application/providers/update-provider-status.use-case';
import { UpdateProviderUseCase } from '../../../../core/application/providers/update-provider.use-case';
import {
  ProviderDetail,
  ProviderStatus,
} from '../../../../core/domain/providers/provider.model';

export interface ProviderFormDialogData {
  provider: ProviderDetail | null;
}

/** Status options editable from the form (DELETED is excluded). */
export const PROVIDER_STATUS_OPTIONS: ProviderStatus[] = [
  'ACTIVE',
  'INACTIVE',
  'DRAFT',
];

@Component({
  selector: 'app-provider-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './provider-form-dialog.component.html',
})
export class ProviderFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ProviderFormDialogComponent>);
  readonly data = inject<ProviderFormDialogData>(MAT_DIALOG_DATA);
  private readonly createUseCase = inject(CreateProviderUseCase);
  private readonly updateUseCase = inject(UpdateProviderUseCase);
  private readonly updateStatusUseCase = inject(UpdateProviderStatusUseCase);

  readonly isEditMode = this.data.provider !== null;
  readonly isSaving = signal(false);
  readonly statusOptions = PROVIDER_STATUS_OPTIONS;

  readonly form = this.fb.nonNullable.group({
    razonSocial: [this.data.provider?.razonSocial ?? '', Validators.required],
    cif: [this.data.provider?.cif ?? ''],
    direccion: [this.data.provider?.direccion ?? ''],
    poblacion: [this.data.provider?.poblacion ?? ''],
    provincia: [this.data.provider?.provincia ?? ''],
    pais: [this.data.provider?.pais ?? ''],
    status: [this.data.provider?.status ?? ('ACTIVE' as ProviderStatus)],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();
    this.isSaving.set(true);

    if (this.isEditMode && this.data.provider) {
      const { razonSocial, cif, direccion, poblacion, provincia, pais, status } = formValue;
      const providerId = this.data.provider.providerId;
      const originalStatus = this.data.provider.status;

      this.updateUseCase
        .execute(providerId, { razonSocial, cif, direccion, poblacion, provincia, pais })
        .pipe(
          switchMap(() =>
            status !== originalStatus
              ? this.updateStatusUseCase.execute(providerId, { status })
              : of(null),
          ),
        )
        .subscribe({
          next: () => this.dialogRef.close(true),
          error: () => this.isSaving.set(false),
        });
    } else {
      this.createUseCase.execute({ razonSocial: formValue.razonSocial, cif: formValue.cif, direccion: formValue.direccion, poblacion: formValue.poblacion, provincia: formValue.provincia, pais: formValue.pais }).subscribe({
        next: () => this.dialogRef.close(true),
        error: () => this.isSaving.set(false),
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
