import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProviderSummary } from '../../../../core/domain/providers/provider.model';
import { FilterableListLayoutComponent } from '../../../shared/components/filterable-list-layout/filterable-list-layout.component';

@Component({
  selector: 'app-provider-list-view',
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
  templateUrl: './provider-list-view.component.html',
  styleUrl: './provider-list-view.component.scss',
})
export class ProviderListViewComponent {
  readonly providers = input<ProviderSummary[]>([]);
  readonly totalProviders = input(0);
  readonly isLoading = input(false);
  readonly searchTerm = input('');

  readonly searchChange = output<string>();
  readonly refresh = output<void>();
  readonly create = output<void>();
  readonly edit = output<ProviderSummary>();
  readonly delete = output<ProviderSummary>();
  readonly pageChange = output<PageEvent>();

  readonly displayedColumns = ['razonSocial', 'status', 'actions'];

  onSearchChange(term: string): void {
    this.searchChange.emit(term);
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  onCreate(): void {
    this.create.emit();
  }

  onEdit(provider: ProviderSummary): void {
    this.edit.emit(provider);
  }

  onDelete(provider: ProviderSummary): void {
    this.delete.emit(provider);
  }

  onPageChange(event: PageEvent): void {
    this.pageChange.emit(event);
  }
}
