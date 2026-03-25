import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AttachInvoiceFileUseCase } from '../../../../core/application/invoices/attach-invoice-file.use-case';
import { CreateManualInvoiceUseCase } from '../../../../core/application/invoices/create-manual-invoice.use-case';
import { GetInvoiceUseCase } from '../../../../core/application/invoices/get-invoice.use-case';
import { UpdateInvoiceUseCase } from '../../../../core/application/invoices/update-invoice.use-case';
import { ToolbarActionButtonComponent } from '../../../shared/components/toolbar-action-button/toolbar-action-button.component';
import {
  FileRef,
  InvoiceDetail,
  InvoiceMovement,
  InvoiceUpdateRequest,
} from '../../../../core/domain/invoices/invoice.model';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ToolbarActionButtonComponent,
  ],
  templateUrl: './invoice-detail.component.html',
  styleUrl: './invoice-detail.component.scss',
})
export class InvoiceDetailComponent implements OnInit {
  private readonly isoDateValidator = this.createIsoDateValidator();

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly attachInvoiceFileUseCase = inject(AttachInvoiceFileUseCase);
  private readonly createManualInvoiceUseCase = inject(CreateManualInvoiceUseCase);
  private readonly getInvoiceUseCase = inject(GetInvoiceUseCase);
  private readonly updateInvoiceUseCase = inject(UpdateInvoiceUseCase);
  private readonly formBuilder = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isUploadingFile = signal(false);
  readonly isCreateMode = signal(false);
  readonly invoiceId = signal('');
  readonly attachedFile = signal<FileRef | null>(null);

  readonly form = this.formBuilder.group({
    providerId: [{ value: '', disabled: true }, [Validators.required]],
    status: [{ value: '', disabled: true }, [Validators.required]],
    numeroFactura: ['', [Validators.required]],
    fechaOperacion: ['', [Validators.required, this.isoDateValidator]],
    fechaVencimiento: ['', [this.isoDateValidator]],
    baseImponible: [0, [Validators.required, Validators.min(0)]],
    iva: [0, [Validators.required, Validators.min(0)]],
    total: [0, [Validators.required, Validators.min(0)]],
    movements: this.formBuilder.array<FormGroup>([]),
  });

  readonly movementTotal = computed(() =>
    this.movementForms().reduce((sum, group) => sum + this.parseNumber(group.get('total')?.value), 0),
  );

  readonly hasTotalsMismatch = computed(() => {
    const headerTotal = this.parseNumber(this.form.controls.total.value);
    return Math.abs(this.movementTotal() - headerTotal) > 0.01;
  });

  get movementsArray(): FormArray<FormGroup> {
    return this.form.controls.movements;
  }

  movementForms(): FormGroup[] {
    return this.movementsArray.controls;
  }

  ngOnInit(): void {
    const invoiceId = this.route.snapshot.paramMap.get('invoiceId');
    if (!invoiceId) {
      this.isCreateMode.set(true);
      this.enableCreateModeDefaults();
      return;
    }

    this.invoiceId.set(invoiceId);
    this.loadInvoice(invoiceId);
  }

  private loadInvoice(invoiceId: string): void {
    this.isLoading.set(true);
    this.getInvoiceUseCase.execute(invoiceId).subscribe({
      next: (invoice) => {
        this.patchInvoice(invoice);
        this.setMovements(invoice.movements ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  saveInvoice(): void {
    if (this.form.invalid || this.hasTotalsMismatch()) {
      this.form.markAllAsTouched();
      return;
    }

    const request: InvoiceUpdateRequest = {
      numeroFactura: this.form.controls.numeroFactura.value ?? '',
      fechaOperacion: this.form.controls.fechaOperacion.value ?? '',
      fechaVencimiento: this.form.controls.fechaVencimiento.value ?? undefined,
      baseImponible: this.parseNumber(this.form.controls.baseImponible.value),
      iva: this.parseNumber(this.form.controls.iva.value),
      total: this.parseNumber(this.form.controls.total.value),
      movements: this.movementsArray.controls.map((group) => ({
        id: this.readString(group, 'id') || undefined,
        concepto: this.readString(group, 'concepto'),
        cantidad: this.parseNumber(group.get('cantidad')?.value),
        precio: this.parseNumber(group.get('precio')?.value),
        baseImponible: this.parseOptionalNumber(group.get('baseImponible')?.value),
        iva: this.parseOptionalNumber(group.get('iva')?.value),
        total: this.parseNumber(group.get('total')?.value),
      })),
    };

    if (this.isCreateMode()) {
      const providerId = this.readStringFromControl(this.form.controls.providerId.value).trim();
      if (providerId === '') {
        this.form.controls.providerId.markAsTouched();
        return;
      }

      this.createInvoice(providerId, request);
      return;
    }

    const invoiceId = this.invoiceId();
    if (invoiceId === '') {
      return;
    }

    this.updateInvoice(invoiceId, request);
  }

  private createInvoice(providerId: string, request: InvoiceUpdateRequest): void {
    this.isSaving.set(true);
    this.createManualInvoiceUseCase
      .execute({
        providerId,
        invoice: {
          ...request,
          movements: request.movements ?? [],
        },
      })
      .subscribe({
        next: (response) => {
          this.isSaving.set(false);
          this.snackBar.open('Factura creada correctamente.', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
          this.router.navigate(['/invoices', response.invoiceId]).catch(() => undefined);
        },
        error: () => {
          this.isSaving.set(false);
          this.snackBar.open('No se pudo crear la factura.', 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
        },
      });
  }

  private updateInvoice(invoiceId: string, request: InvoiceUpdateRequest): void {
    this.isSaving.set(true);
    this.updateInvoiceUseCase.execute(invoiceId, request).subscribe({
      next: (invoice) => {
        this.patchInvoice(invoice);
        this.setMovements(invoice.movements ?? []);
        this.isSaving.set(false);
        this.snackBar.open('Factura guardada correctamente.', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      },
      error: () => {
        this.isSaving.set(false);
        this.snackBar.open('No se pudo guardar la factura.', 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      },
    });
  }

  addMovement(): void {
    this.movementsArray.push(this.createMovementForm());
  }

  removeMovement(index: number): void {
    if (this.movementsArray.length <= 1) {
      return;
    }

    this.movementsArray.removeAt(index);
  }

  private patchInvoice(invoice: InvoiceDetail): void {
    this.attachedFile.set(invoice.fileRef ?? null);

    this.form.patchValue({
      providerId: invoice.providerId,
      status: invoice.status,
      numeroFactura: invoice.numeroFactura ?? '',
      fechaOperacion: invoice.fechaOperacion ?? '',
      fechaVencimiento: invoice.fechaVencimiento ?? '',
      baseImponible: this.parseNumber(invoice.baseImponible),
      iva: this.parseNumber(invoice.iva),
      total: this.parseNumber(invoice.total),
    });
  }

  private enableCreateModeDefaults(): void {
    this.attachedFile.set(null);
    this.form.controls.providerId.enable();
    this.form.controls.status.setValue('DRAFT');
    this.form.controls.numeroFactura.setValue('');
    this.form.controls.fechaOperacion.setValue('');
    this.form.controls.fechaVencimiento.setValue('');
    this.form.controls.baseImponible.setValue(0);
    this.form.controls.iva.setValue(0);
    this.form.controls.total.setValue(0);
    this.setMovements([]);
  }

  private setMovements(movements: InvoiceMovement[]): void {
    this.movementsArray.clear();
    if (movements.length === 0) {
      this.movementsArray.push(this.createMovementForm());
      return;
    }

    movements.forEach((movement) => {
      this.movementsArray.push(this.createMovementForm(movement));
    });
  }

  private createMovementForm(movement?: InvoiceMovement): FormGroup {
    return this.formBuilder.group({
      id: [movement?.id ?? ''],
      concepto: [movement?.concepto ?? '', [Validators.required]],
      cantidad: [movement?.cantidad ?? 1, [Validators.required, Validators.min(0.000001)]],
      precio: [movement?.precio ?? 0, [Validators.required, Validators.min(0)]],
      baseImponible: [movement?.baseImponible ?? 0, [Validators.min(0)]],
      iva: [movement?.iva ?? 0, [Validators.min(0)]],
      total: [movement?.total ?? 0, [Validators.required, Validators.min(0)]],
    });
  }

  private readString(group: FormGroup, field: string): string {
    const value = group.get(field)?.value;
    return typeof value === 'string' ? value : '';
  }

  private parseNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private parseOptionalNumber(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private readStringFromControl(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0);

    if (!file) {
      return;
    }

    this.attachSourceFile(file);

    if (input) {
      input.value = '';
    }
  }

  attachSourceFile(file: File): void {
    if (this.isCreateMode()) {
      this.snackBar.open('Guarda la factura antes de adjuntar el PDF.', 'Cerrar', {
        duration: 3500,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
      return;
    }

    const invoiceId = this.invoiceId();
    if (invoiceId === '') {
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      this.snackBar.open('Solo se permiten archivos PDF.', 'Cerrar', {
        duration: 3500,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
      return;
    }

    this.isUploadingFile.set(true);
    this.attachInvoiceFileUseCase.execute(invoiceId, file).subscribe({
      next: (invoice) => {
        this.attachedFile.set(invoice.fileRef ?? null);
        this.isUploadingFile.set(false);
        this.snackBar.open('Documento adjuntado correctamente.', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      },
      error: () => {
        this.isUploadingFile.set(false);
        this.snackBar.open('No se pudo adjuntar el documento.', 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      },
    });
  }

  formatFileSize(sizeBytes: number): string {
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }

    const sizeKb = sizeBytes / 1024;
    if (sizeKb < 1024) {
      return `${sizeKb.toFixed(1)} KB`;
    }

    return `${(sizeKb / 1024).toFixed(2)} MB`;
  }

  private createIsoDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const rawValue = control.value;
      if (rawValue === null || rawValue === undefined || rawValue === '') {
        return null;
      }

      if (typeof rawValue !== 'string') {
        return { invalidDate: true };
      }

      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawValue);
      if (!match) {
        return { invalidDate: true };
      }

      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

      const utcDate = new Date(Date.UTC(year, month - 1, day));
      const isValid =
        utcDate.getUTCFullYear() === year &&
        utcDate.getUTCMonth() === month - 1 &&
        utcDate.getUTCDate() === day;

      return isValid ? null : { invalidDate: true };
    };
  }
}
