import { Component, input, output } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ListSearchInputComponent } from '../list-search-input/list-search-input.component';
import { SectionToolbarComponent } from '../section-toolbar/section-toolbar.component';
import { ToolbarActionButtonComponent } from '../toolbar-action-button/toolbar-action-button.component';

@Component({
  selector: 'app-filterable-list-layout',
  standalone: true,
  imports: [
    SectionToolbarComponent,
    ToolbarActionButtonComponent,
    ListSearchInputComponent,
    MatProgressSpinnerModule,
  ],
  templateUrl: './filterable-list-layout.component.html',
  styleUrl: './filterable-list-layout.component.scss',
})
export class FilterableListLayoutComponent {
  readonly title = input.required<string>();
  readonly searchLabel = input('Buscar');
  readonly searchPlaceholder = input('Buscar...');
  readonly searchTooltip = input('Buscar');
  readonly searchTerm = input('');
  readonly isLoading = input(false);

  readonly refreshTooltip = input('Refrescar lista');
  readonly createLabel = input('Nuevo');
  readonly createTooltip = input('Nuevo');

  readonly searchChange = output<string>();
  readonly refresh = output<void>();
  readonly create = output<void>();

  onSearchChange(term: string): void {
    this.searchChange.emit(term);
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  onCreate(): void {
    this.create.emit();
  }
}
