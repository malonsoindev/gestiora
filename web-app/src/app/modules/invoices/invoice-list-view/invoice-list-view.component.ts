import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { InvoiceSummary } from '../../../../core/domain/invoices/invoice.model';
import { FilterableListLayoutComponent } from '../../../shared/components/filterable-list-layout/filterable-list-layout.component';

@Component({
  selector: 'app-invoice-list-view',
  standalone: true,
  imports: [
    FilterableListLayoutComponent,
    MatTableModule,
    MatChipsModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    RouterLink,
  ],
  templateUrl: './invoice-list-view.component.html',
  styleUrl: './invoice-list-view.component.scss',
})
export class InvoiceListViewComponent {
  readonly invoices = input<InvoiceSummary[]>([]);
  readonly deletingInvoiceIds = input<string[]>([]);
  readonly totalInvoices = input(0);
  readonly isLoading = input(false);
  readonly searchTerm = input('');

  readonly searchChange = output<string>();
  readonly refresh = output<void>();
  readonly create = output<void>();
  readonly download = output<InvoiceSummary>();
  readonly delete = output<InvoiceSummary>();
  readonly pageChange = output<PageEvent>();

  readonly displayedColumns = ['invoiceId', 'providerId', 'status', 'createdAt', 'actions'];

  private readonly statusLabelMap: Record<InvoiceSummary['status'], string> = {
    DRAFT: 'Borrador',
    ACTIVE: 'Activa',
    INCONSISTENT: 'Inconsistente',
    DELETED: 'Eliminada',
  };

  onSearchChange(term: string): void {
    this.searchChange.emit(term);
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  onCreate(): void {
    this.create.emit();
  }

  onPageChange(event: PageEvent): void {
    this.pageChange.emit(event);
  }

  onDownload(invoice: InvoiceSummary): void {
    this.download.emit(invoice);
  }

  onDelete(invoice: InvoiceSummary): void {
    this.delete.emit(invoice);
  }

  isDeleting(invoiceId: string): boolean {
    return this.deletingInvoiceIds().includes(invoiceId);
  }

  getStatusLabel(status: InvoiceSummary['status']): string {
    return this.statusLabelMap[status];
  }

  formatCreatedAt(createdAt: string): string {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
      return createdAt;
    }

    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();

    return `${day}-${month}-${year}`;
  }
}
