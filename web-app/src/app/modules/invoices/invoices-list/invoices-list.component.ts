import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { GetInvoicesUseCase } from '../../../../core/application/invoices/get-invoices.use-case';
import { InvoiceListParams } from '../../../../core/domain/invoices/invoice-list-params.model';
import { InvoiceSummary } from '../../../../core/domain/invoices/invoice.model';
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

  readonly invoices = signal<InvoiceSummary[]>([]);
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

  openCreateInvoice(): void {}

  private loadInvoices(): void {
    const params: InvoiceListParams = {
      page: this.currentPage,
      pageSize: this.pageSize,
    };

    this.isLoading.set(true);
    this.getInvoicesUseCase.execute(params).subscribe({
      next: (response) => {
        this.invoices.set(
          [...response.items].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        );
        this.totalInvoices.set(response.total ?? 0);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
