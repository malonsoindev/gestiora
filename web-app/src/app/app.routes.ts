import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./modules/auth/login/login.component').then(
            (m) => m.LoginComponent,
          ),
      },
    ],
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./modules/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'providers',
        loadComponent: () =>
          import('./modules/providers/providers-list/providers-list.component').then(
            (m) => m.ProvidersListComponent,
          ),
      },
      {
        path: 'invoices/new',
        loadComponent: () =>
          import('./modules/invoices/invoice-detail/invoice-detail.component').then(
            (m) => m.InvoiceDetailComponent,
          ),
      },
      {
        path: 'invoices/:invoiceId',
        loadComponent: () =>
          import('./modules/invoices/invoice-detail/invoice-detail.component').then(
            (m) => m.InvoiceDetailComponent,
          ),
      },
      {
        path: 'invoices',
        loadComponent: () =>
          import('./modules/invoices/invoices-list/invoices-list.component').then(
            (m) => m.InvoicesListComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
