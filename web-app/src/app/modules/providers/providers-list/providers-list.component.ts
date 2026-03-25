import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, switchMap } from 'rxjs/operators';
import { GetProvidersUseCase } from '../../../../core/application/providers/get-providers.use-case';
import { DeleteProviderUseCase } from '../../../../core/application/providers/delete-provider.use-case';
import { ProviderSummary } from '../../../../core/domain/providers/provider.model';
import { ProviderListParams } from '../../../../core/domain/providers/provider-list-params.model';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../confirm-dialog/confirm-dialog.component';
import {
  ProviderFormDialogComponent,
  ProviderFormDialogData,
} from '../provider-form-dialog/provider-form-dialog.component';
import { ToolbarActionButtonComponent } from '../../../shared/components/toolbar-action-button/toolbar-action-button.component';
import { SectionToolbarComponent } from '../../../shared/components/section-toolbar/section-toolbar.component';

@Component({
  selector: 'app-providers-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ToolbarActionButtonComponent,
    SectionToolbarComponent,
  ],
  templateUrl: './providers-list.component.html',
  styleUrl: './providers-list.component.scss',
})
export class ProvidersListComponent implements OnInit {
  private readonly getProvidersUseCase = inject(GetProvidersUseCase);
  private readonly deleteProviderUseCase = inject(DeleteProviderUseCase);
  private readonly dialog = inject(MatDialog);

  readonly displayedColumns = ['razonSocial', 'status', 'actions'];
  readonly providers = signal<ProviderSummary[]>([]);
  readonly totalProviders = signal(0);
  readonly isLoading = signal(false);

  private currentPage = 1;
  private readonly pageSize = 10;

  ngOnInit(): void {
    this.loadProviders();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.loadProviders();
  }

  refreshProviders(): void {
    this.loadProviders();
  }

  openCreateDialog(): void {
    const data: ProviderFormDialogData = { provider: null };
    const dialogRef = this.dialog.open(ProviderFormDialogComponent, {
      width: '600px',
      data,
    });
    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.loadProviders();
      }
    });
  }

  openEditDialog(provider: ProviderSummary): void {
    const data: ProviderFormDialogData = { provider: { ...provider, createdAt: '', updatedAt: '' } };
    const dialogRef = this.dialog.open(ProviderFormDialogComponent, {
      width: '600px',
      data,
    });
    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.loadProviders();
      }
    });
  }

  deleteProvider(providerId: string, razonSocial: string): void {
    const data: ConfirmDialogData = {
      title: 'Eliminar proveedor',
      message: `¿Estás seguro de que deseas eliminar "${razonSocial}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data })
      .afterClosed()
      .pipe(
        filter((confirmed: boolean) => confirmed === true),
        switchMap(() => this.deleteProviderUseCase.execute(providerId)),
      )
      .subscribe(() => this.loadProviders());
  }

  private loadProviders(): void {
    const params: ProviderListParams = {
      page: this.currentPage,
      pageSize: this.pageSize,
    };
    this.isLoading.set(true);
    this.getProvidersUseCase.execute(params).subscribe({
      next: (response) => {
        this.providers.set(
          [...response.items].sort((a, b) =>
            a.razonSocial.localeCompare(b.razonSocial, 'es', { sensitivity: 'base' }),
          ),
        );
        this.totalProviders.set(response.total ?? 0);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
