import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
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
  ],
  templateUrl: './invoice-list-view.component.html',
  styleUrl: './invoice-list-view.component.scss',
})
export class InvoiceListViewComponent {
  readonly invoices = input<InvoiceSummary[]>([]);
  readonly totalInvoices = input(0);
  readonly isLoading = input(false);
  readonly searchTerm = input('');

  readonly searchChange = output<string>();
  readonly refresh = output<void>();
  readonly create = output<void>();
  readonly pageChange = output<PageEvent>();

  readonly displayedColumns = ['invoiceId', 'providerId', 'status', 'createdAt'];

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
}
