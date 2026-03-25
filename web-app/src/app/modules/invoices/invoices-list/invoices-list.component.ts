import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { filter, finalize, switchMap } from 'rxjs/operators';
import { GetInvoicesUseCase } from '../../../../core/application/invoices/get-invoices.use-case';
import { GetInvoiceFileUseCase } from '../../../../core/application/invoices/get-invoice-file.use-case';
import { DeleteInvoiceUseCase } from '../../../../core/application/invoices/delete-invoice.use-case';
import { InvoiceListParams } from '../../../../core/domain/invoices/invoice-list-params.model';
import { InvoiceSummary } from '../../../../core/domain/invoices/invoice.model';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../providers/confirm-dialog/confirm-dialog.component';
import { InvoiceListViewComponent } from '../invoice-list-view/invoice-list-view.component';

@Component({
  selector: 'app-invoices-list',
  standalone: true,
  imports: [InvoiceListViewComponent],
  templateUrl: './invoices-list.component.html',
  styleUrl: './invoices-list.component.scss',
})
export class InvoicesListComponent implements OnInit {
  private readonly getInvoicesUseCase = inject(GetInvoicesUseCase);
  private readonly getInvoiceFileUseCase = inject(GetInvoiceFileUseCase);
  private readonly deleteInvoiceUseCase = inject(DeleteInvoiceUseCase);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly invoices = signal<InvoiceSummary[]>([]);
  readonly deletingInvoiceIds = signal<string[]>([]);
  readonly totalInvoices = signal(0);
  readonly isLoading = signal(false);
  readonly searchTerm = signal('');

  readonly visibleInvoices = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (term === '') {
      return this.invoices();
    }

    return this.invoices().filter(
      (invoice) =>
        invoice.invoiceId.toLowerCase().includes(term) ||
        invoice.providerId.toLowerCase().includes(term),
    );
  });

  private currentPage = 1;
  private pageSize = 10;

  ngOnInit(): void {
    this.loadInvoices();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadInvoices();
  }

  refreshInvoices(): void {
    this.loadInvoices();
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  openCreateInvoice(): void {
    this.router.navigate(['/invoices/new']).catch(() => undefined);
  }

  downloadInvoiceDocument(invoice: InvoiceSummary): void {
    this.getInvoiceFileUseCase.execute(invoice.invoiceId).subscribe({
      next: (blob) => {
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${invoice.invoiceId}.pdf`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
      },
    });
  }

  deleteInvoice(invoice: InvoiceSummary): void {
    if (this.deletingInvoiceIds().includes(invoice.invoiceId)) {
      return;
    }

    const data: ConfirmDialogData = {
      title: 'Eliminar factura',
      message: `¿Estás seguro de que deseas eliminar la factura "${invoice.invoiceId}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data })
      .afterClosed()
      .pipe(
        filter((confirmed: boolean) => confirmed === true),
        switchMap(() => {
          this.markDeleting(invoice.invoiceId, true);
          return this.deleteInvoiceUseCase.execute(invoice.invoiceId).pipe(
            finalize(() => this.markDeleting(invoice.invoiceId, false)),
          );
        }),
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Factura eliminada correctamente.', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
          this.loadInvoices();
        },
        error: () => {
          this.snackBar.open('No se pudo eliminar la factura.', 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
        },
      });
  }

  private markDeleting(invoiceId: string, deleting: boolean): void {
    if (deleting) {
      if (!this.deletingInvoiceIds().includes(invoiceId)) {
        this.deletingInvoiceIds.set([...this.deletingInvoiceIds(), invoiceId]);
      }
      return;
    }

    this.deletingInvoiceIds.set(this.deletingInvoiceIds().filter((id) => id !== invoiceId));
  }

  private loadInvoices(): void {
    const params: InvoiceListParams = {
      page: this.currentPage,
      pageSize: this.pageSize,
    };

    this.isLoading.set(true);
    this.getInvoicesUseCase.execute(params).subscribe({
      next: (response) => {
        this.invoices.set(
          [...response.items].sort((a, b) => this.compareByDateDesc(a, b)),
        );
        this.totalInvoices.set(response.total ?? 0);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  private compareByDateDesc(a: InvoiceSummary, b: InvoiceSummary): number {
    const aTime = this.parseDateToEpoch(a.createdAt);
    const bTime = this.parseDateToEpoch(b.createdAt);

    if (aTime !== bTime) {
      return bTime - aTime;
    }

    return a.invoiceId.localeCompare(b.invoiceId, 'es', { sensitivity: 'base' });
  }

  private parseDateToEpoch(value: string): number {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
  }
}
