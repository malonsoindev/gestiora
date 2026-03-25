import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GetInvoiceUseCase } from '../../../../core/application/invoices/get-invoice.use-case';
import { UpdateInvoiceUseCase } from '../../../../core/application/invoices/update-invoice.use-case';
import { ToolbarActionButtonComponent } from '../../../shared/components/toolbar-action-button/toolbar-action-button.component';
import {
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
  private readonly route = inject(ActivatedRoute);
  private readonly getInvoiceUseCase = inject(GetInvoiceUseCase);
  private readonly updateInvoiceUseCase = inject(UpdateInvoiceUseCase);
  private readonly formBuilder = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly invoiceId = signal('');

  readonly form = this.formBuilder.group({
    providerId: [{ value: '', disabled: true }, [Validators.required]],
    status: [{ value: '', disabled: true }, [Validators.required]],
    numeroFactura: ['', [Validators.required]],
    fechaOperacion: ['', [Validators.required]],
    fechaVencimiento: [''],
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

    const invoiceId = this.invoiceId();
    if (invoiceId === '') {
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
    this.movementsArray.removeAt(index);
  }

  private patchInvoice(invoice: InvoiceDetail): void {
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
}
